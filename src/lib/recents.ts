import { getReference } from "./nutrition";
import type { ReferenceFood, Scan } from "./types";

export interface FrequentFood {
  food: ReferenceFood;
  count: number;
  lastAt: number;
}

/**
 * เมนูที่กินบ่อย: นับเฉพาะรายการที่จับคู่กับเมนูอ้างอิงได้ (บันทึกซ้ำได้ด้วยตัวเลขเดิม)
 * เรียงตามจำนวนครั้ง แล้วตามครั้งล่าสุด
 */
export function frequentFoods(scans: Scan[], limit = 8): FrequentFood[] {
  const byKey = new Map<string, FrequentFood>();
  for (const scan of scans) {
    for (const item of scan.items) {
      if (!item.refKey) continue;
      const food = getReference(item.refKey);
      if (!food) continue;
      const entry = byKey.get(item.refKey) ?? { food, count: 0, lastAt: 0 };
      entry.count++;
      entry.lastAt = Math.max(entry.lastAt, scan.createdAt);
      byKey.set(item.refKey, entry);
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt).slice(0, limit);
}
