/**
 * ค่าที่หน้าจอโหลดล่าสุด (เก็บในหน่วยความจำ) ให้สลับหน้าแล้วเห็นข้อมูลทันที แล้วค่อยโหลดใหม่เบื้องหลัง
 * - ครั้งแรกที่เปิดแอป: แสดงสำเนาในเครื่อง (ถ้ามี) ก่อน ระหว่างรอ cloud
 * - หลายจุดขอ key เดียวกันพร้อมกัน → ยิงคำขอครั้งเดียว
 */
export interface QuerySource<T> {
  key: string;
  remote: () => Promise<T>;
  /** สำเนาในเครื่อง: undefined = ไม่มีข้อมูล (ให้รอ cloud) */
  local?: () => Promise<T | undefined>;
}

export interface QueryCache {
  peek<T>(key: string): T | undefined;
  /** เรียก onValue เมื่อได้ค่า (สำเนาในเครื่องก่อน แล้วค่าจาก cloud) / คืนฟังก์ชันยกเลิก */
  load<T>(source: QuerySource<T>, onValue: (value: T) => void): () => void;
  /** ข้อมูลเปลี่ยน: คำขอที่ค้างอยู่ใช้ไม่ได้แล้ว */
  invalidate(): void;
  clear(): void;
}

export function createQueryCache(): QueryCache {
  const values = new Map<string, unknown>();
  const inflight = new Map<string, Promise<unknown>>();
  let generation = 0;

  function fetchRemote<T>(key: string, remote: () => Promise<T>): Promise<T> {
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const startedAt = generation;
    const request = remote().then((value) => {
      // คำขอเก่าที่เริ่มก่อนข้อมูลเปลี่ยน ห้ามทับค่าที่ใหม่กว่า
      if (startedAt === generation) values.set(key, value);
      return value;
    });
    inflight.set(key, request);
    const done = () => {
      if (inflight.get(key) === request) inflight.delete(key);
    };
    request.then(done, done);
    return request;
  }

  return {
    peek: <T>(key: string) => values.get(key) as T | undefined,
    load<T>({ key, remote, local }: QuerySource<T>, onValue: (value: T) => void) {
      let active = true;
      let remoteDone = false;

      if (local && !values.has(key)) {
        local().then(
          (value) => {
            if (active && !remoteDone && value !== undefined) onValue(value);
          },
          () => {},
        );
      }
      fetchRemote(key, remote).then(
        (value) => {
          remoteDone = true;
          if (active) onValue(value);
        },
        () => {},
      );
      return () => {
        active = false;
      };
    },
    invalidate() {
      generation++;
      inflight.clear();
    },
    clear() {
      generation++;
      inflight.clear();
      values.clear();
    },
  };
}
