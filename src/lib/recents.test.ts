import { describe, expect, it } from "vitest";
import { itemFromReference, REFERENCE_FOODS } from "./nutrition";
import { frequentFoods } from "./recents";
import type { FoodItem, Scan } from "./types";

const ref = (key: string) => itemFromReference(REFERENCE_FOODS.find((f) => f.key === key)!);
const scan = (createdAt: number, items: FoodItem[]): Scan => ({
  id: String(createdAt),
  date: "2026-10-26",
  meal: "lunch",
  createdAt,
  thumbnail: null,
  items,
});

describe("frequentFoods", () => {
  it("เรียงตามจำนวนครั้ง แล้วตามครั้งล่าสุด และข้ามรายการประมาณการ", () => {
    const estimated: FoodItem = { ...ref("thai_tea"), refKey: null, estimated: true };
    const result = frequentFoods([
      scan(1, [ref("rice_white"), ref("fried_egg")]),
      scan(2, [ref("rice_white"), ref("thai_tea")]),
      scan(3, [ref("latte"), estimated]),
    ]);
    expect(result.map((f) => [f.food.key, f.count])).toEqual([
      ["rice_white", 2],
      ["latte", 1],
      ["thai_tea", 1],
      ["fried_egg", 1],
    ]);
  });

  it("จำกัดจำนวน และไม่มีข้อมูล = ว่าง", () => {
    expect(frequentFoods([scan(1, [ref("rice_white"), ref("fried_egg"), ref("latte")])], 2)).toHaveLength(2);
    expect(frequentFoods([])).toEqual([]);
  });
});
