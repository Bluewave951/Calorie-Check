import { describe, expect, it } from "vitest";
import { createQueryCache } from "./queryCache";

/** promise ที่สั่งให้ resolve เองได้ ไว้กำหนดลำดับว่าอะไรเสร็จก่อน */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createQueryCache", () => {
  it("ยังไม่เคยโหลด → peek ได้ undefined / โหลดเสร็จแล้วจำค่าไว้", async () => {
    const cache = createQueryCache();
    expect(cache.peek("settings")).toBeUndefined();

    const values: number[] = [];
    cache.load({ key: "settings", remote: async () => 1 }, (v) => values.push(v));
    await flush();

    expect(values).toEqual([1]);
    expect(cache.peek("settings")).toBe(1);
  });

  it("แสดงสำเนาในเครื่องก่อน แล้วแทนด้วยค่าจาก cloud", async () => {
    const cache = createQueryCache();
    const remote = deferred<string>();
    const values: string[] = [];

    cache.load({ key: "k", remote: () => remote.promise, local: async () => "local" }, (v) => values.push(v));
    await flush();
    expect(values).toEqual(["local"]);

    remote.resolve("remote");
    await flush();
    expect(values).toEqual(["local", "remote"]);
    expect(cache.peek("k")).toBe("remote");
  });

  it("cloud ตอบก่อนสำเนาในเครื่อง → ไม่เอาสำเนา (เก่ากว่า) มาทับ", async () => {
    const cache = createQueryCache();
    const local = deferred<string | undefined>();
    const values: string[] = [];

    cache.load({ key: "k", remote: async () => "remote", local: () => local.promise }, (v) => values.push(v));
    await flush();
    local.resolve("local");
    await flush();

    expect(values).toEqual(["remote"]);
  });

  it("สำเนาในเครื่องไม่มีข้อมูล (undefined) → รอ cloud อย่างเดียว", async () => {
    const cache = createQueryCache();
    const values: (string | undefined)[] = [];
    const remote = deferred<string>();

    cache.load({ key: "k", remote: () => remote.promise, local: async () => undefined }, (v) => values.push(v));
    await flush();
    expect(values).toEqual([]);

    remote.resolve("remote");
    await flush();
    expect(values).toEqual(["remote"]);
  });

  it("เคยโหลดแล้ว (มีค่าในหน่วยความจำ) → ไม่ต้องอ่านสำเนาในเครื่องซ้ำ", async () => {
    const cache = createQueryCache();
    cache.load({ key: "k", remote: async () => "first" }, () => {});
    await flush();

    let localCalls = 0;
    const values: string[] = [];
    cache.load(
      {
        key: "k",
        remote: async () => "second",
        local: async () => {
          localCalls++;
          return "local";
        },
      },
      (v) => values.push(v),
    );
    await flush();

    expect(localCalls).toBe(0);
    expect(values).toEqual(["second"]);
  });

  it("หลายจุดขอ key เดียวกันพร้อมกัน → ยิงคำขอไป cloud ครั้งเดียว", async () => {
    const cache = createQueryCache();
    let calls = 0;
    const remote = async () => {
      calls++;
      return "v";
    };
    const a: string[] = [];
    const b: string[] = [];

    cache.load({ key: "settings", remote }, (v) => a.push(v));
    cache.load({ key: "settings", remote }, (v) => b.push(v));
    await flush();

    expect(calls).toBe(1);
    expect(a).toEqual(["v"]);
    expect(b).toEqual(["v"]);
  });

  it("ข้อมูลเปลี่ยน (invalidate) → คำขอถัดไปต้องยิงใหม่ ไม่ใช้คำขอที่ค้างอยู่", async () => {
    const cache = createQueryCache();
    let calls = 0;
    const first = deferred<string>();
    const remote = () => (++calls === 1 ? first.promise : Promise.resolve("new"));

    cache.load({ key: "k", remote }, () => {});
    cache.invalidate();
    const values: string[] = [];
    cache.load({ key: "k", remote }, (v) => values.push(v));
    first.resolve("old");
    await flush();

    expect(calls).toBe(2);
    expect(values).toEqual(["new"]);
    expect(cache.peek("k")).toBe("new");
  });

  it("คำขอเก่าที่เสร็จทีหลัง invalidate ไม่ทับค่าที่ใหม่กว่า", async () => {
    const cache = createQueryCache();
    const first = deferred<string>();
    let calls = 0;
    const remote = () => (++calls === 1 ? first.promise : Promise.resolve("new"));

    cache.load({ key: "k", remote }, () => {});
    cache.invalidate();
    cache.load({ key: "k", remote }, () => {});
    await flush();
    first.resolve("old");
    await flush();

    expect(cache.peek("k")).toBe("new");
  });

  it("ยกเลิกแล้ว (หน้าจอปิด) → ไม่เรียก onValue", async () => {
    const cache = createQueryCache();
    const remote = deferred<string>();
    const values: string[] = [];

    const cancel = cache.load({ key: "k", remote: () => remote.promise, local: async () => "local" }, (v) => values.push(v));
    cancel();
    remote.resolve("remote");
    await flush();

    expect(values).toEqual([]);
    // ค่าที่ได้ยังจำไว้ให้หน้าจอถัดไปใช้
    expect(cache.peek("k")).toBe("remote");
  });

  it("cloud ล้มเหลว → ไม่ throw ออกมา และคำขอถัดไปลองใหม่ได้", async () => {
    const cache = createQueryCache();
    let calls = 0;
    const remote = () => (++calls === 1 ? Promise.reject(new Error("down")) : Promise.resolve("ok"));

    cache.load({ key: "k", remote }, () => {});
    await flush();
    const values: string[] = [];
    cache.load({ key: "k", remote }, (v) => values.push(v));
    await flush();

    expect(values).toEqual(["ok"]);
  });

  it("clear (ออกจากระบบ) → ลืมค่าทั้งหมด", async () => {
    const cache = createQueryCache();
    cache.load({ key: "k", remote: async () => "v" }, () => {});
    await flush();
    cache.clear();
    expect(cache.peek("k")).toBeUndefined();
  });
});
