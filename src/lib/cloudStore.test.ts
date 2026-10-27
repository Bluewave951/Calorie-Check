import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseStore } from "./cloudStore";
import { DEFAULT_SETTINGS, type Scan } from "./types";

interface Recorded {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

/** supabase-js ตัวจริง แต่จำลอง fetch: บันทึกคำขอ และตอบตามที่กำหนด */
function setup(respond: (req: Recorded) => { status?: number; body?: unknown } = () => ({ body: [] })) {
  const requests: Recorded[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req: Recorded = {
      method: init?.method ?? "GET",
      url: new URL(String(input)),
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    requests.push(req);
    const { status = 200, body = null } = respond(req);
    return new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  const client = createClient("https://proj.supabase.co", "public-key", { global: { fetch }, auth: { persistSession: false } });
  return { store: createSupabaseStore(client), requests };
}

const scan: Scan = { id: "s1", date: "2026-10-27", meal: "lunch", createdAt: 5, thumbnail: "data:image/jpeg;base64,AA", items: [] };
const scanRow = { id: "s1", date: "2026-10-27", meal: "lunch", created_at: 5, thumbnail: "data:image/jpeg;base64,AA", items: [] };

describe("createSupabaseStore", () => {
  it("อ่านการสแกนของวัน: กรองวันที่ เรียงตามเวลา แล้วแปลงเป็น Scan", async () => {
    const { store, requests } = setup(() => ({ body: [scanRow] }));
    expect(await store.getScansByDate("2026-10-27")).toEqual([scan]);

    const { url, method } = requests[0];
    expect(method).toBe("GET");
    expect(url.pathname).toBe("/rest/v1/scans");
    expect(url.searchParams.get("date")).toBe("eq.2026-10-27");
    expect(url.searchParams.get("order")).toBe("created_at.asc");
  });

  it("อ่านช่วงวันแบบไม่เอารูปย่อ → ไม่ select คอลัมน์ thumbnail", async () => {
    const { store, requests } = setup(() => ({ body: [] }));
    await store.getScansInRange("2026-10-01", "2026-10-31", { thumbnails: false });

    const { searchParams } = requests[0].url;
    expect(searchParams.get("select")).not.toContain("thumbnail");
    expect(searchParams.getAll("date")).toEqual(["gte.2026-10-01", "lte.2026-10-31"]);
  });

  it("บันทึกการสแกน = upsert ตาม (user_id, id)", async () => {
    const { store, requests } = setup(() => ({ status: 201 }));
    await store.putScan(scan);

    const { method, url, headers, body } = requests[0];
    expect(method).toBe("POST");
    expect(url.pathname).toBe("/rest/v1/scans");
    expect(url.searchParams.get("on_conflict")).toBe("user_id,id");
    expect(headers.get("prefer")).toContain("resolution=merge-duplicates");
    expect(body).toEqual([scanRow]);
  });

  it("ลบการสแกนตาม id", async () => {
    const { store, requests } = setup(() => ({ status: 204 }));
    await store.deleteScan("s1");
    expect(requests[0].method).toBe("DELETE");
    expect(requests[0].url.searchParams.get("id")).toBe("eq.s1");
  });

  it("น้ำหนัก: อ่านเรียงตามวัน และ upsert ตาม (user_id, date)", async () => {
    const { store, requests } = setup((req) => (req.method === "GET" ? { body: [{ date: "2026-10-27", weight_kg: 60.5 }] } : { status: 201 }));
    expect(await store.getWeights()).toEqual([{ date: "2026-10-27", weightKg: 60.5 }]);
    expect(requests[0].url.searchParams.get("order")).toBe("date.asc");

    await store.putWeight({ date: "2026-10-28", weightKg: 61 });
    expect(requests[1].url.searchParams.get("on_conflict")).toBe("user_id,date");
    expect(requests[1].body).toEqual([{ date: "2026-10-28", weight_kg: 61 }]);
  });

  it("การตั้งค่า: ยังไม่มีแถว → ค่าเริ่มต้น / บันทึก = upsert ตาม user_id", async () => {
    const { store, requests } = setup((req) => (req.method === "GET" ? { body: [] } : { status: 201 }));
    expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS);

    await store.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1700 });
    expect(requests[1].url.pathname).toBe("/rest/v1/settings");
    expect(requests[1].url.searchParams.get("on_conflict")).toBe("user_id");
    expect(requests[1].body).toEqual({ data: { ...DEFAULT_SETTINGS, dailyGoal: 1700 } });
  });

  it("นำเข้าข้อมูลจำนวนมาก → แบ่งส่งทีละชุด", async () => {
    const { store, requests } = setup(() => ({ status: 201 }));
    const scans = Array.from({ length: 120 }, (_, i) => ({ ...scan, id: `s${i}` }));
    await store.importData(scans, DEFAULT_SETTINGS, [{ date: "2026-10-27", weightKg: 60 }]);

    const scanBatches = requests.filter((r) => r.url.pathname === "/rest/v1/scans").map((r) => (r.body as unknown[]).length);
    expect(scanBatches).toEqual([50, 50, 20]);
    expect(requests.some((r) => r.url.pathname === "/rest/v1/weights")).toBe(true);
    expect(requests.some((r) => r.url.pathname === "/rest/v1/settings")).toBe(true);
  });

  it("Supabase ตอบ error → throw", async () => {
    const { store } = setup(() => ({ status: 401, body: { message: "JWT expired", code: "PGRST301" } }));
    await expect(store.getScansByDate("2026-10-27")).rejects.toThrow("JWT expired");
    await expect(store.putScan(scan)).rejects.toThrow();
  });
});
