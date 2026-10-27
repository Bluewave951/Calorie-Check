/** แท็บของหน้า "วันนี้" — เก็บใน URL (?tab=) เพื่อให้กดย้อนกลับแล้วกลับมาแท็บเดิม */
export const TODAY_TABS = ["meals", "nutrients", "weight"] as const;
export type TodayTab = (typeof TODAY_TABS)[number];

export const DEFAULT_TODAY_TAB: TodayTab = "meals";

export function parseTodayTab(value: string | null): TodayTab {
  return (TODAY_TABS as readonly string[]).includes(value ?? "") ? (value as TodayTab) : DEFAULT_TODAY_TAB;
}

/** แท็บถัดไป (+1) หรือก่อนหน้า (-1) แบบวนรอบ ใช้กับปุ่มลูกศรซ้าย/ขวา */
export function stepTodayTab(current: TodayTab, direction: 1 | -1): TodayTab {
  const index = TODAY_TABS.indexOf(current);
  return TODAY_TABS[(index + direction + TODAY_TABS.length) % TODAY_TABS.length];
}
