import { describe, expect, it } from "vitest";
import {
  REFERENCE_FOODS,
  canAdjustSweetness,
  computeKcal,
  itemFromReference,
  withSweetness,
  dateKey,
  findReference,
  guessMeal,
  itemFromAi,
  itemKcal,
  itemMacros,
  replaceWithReference,
  searchReferences,
  servingUnitOf,
  sumItems,
  sumMacros,
  withGrams,
  withPortion,
} from "./nutrition";

const ai = (over: Partial<Parameters<typeof itemFromAi>[0]> = {}) => ({
  name_th: "ข้าวสวย",
  name_en: "Steamed rice",
  matchKey: "rice_white" as string | null,
  grams: 200,
  confidence: 0.9,
  kcal_estimate: 999,
  is_drink: false,
  ...over,
});

describe("ตารางเมนูอ้างอิง", () => {
  it("key ไม่ซ้ำและค่าถูกต้อง", () => {
    const keys = REFERENCE_FOODS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(REFERENCE_FOODS.length).toBeGreaterThanOrEqual(80);
    for (const f of REFERENCE_FOODS) {
      expect(f.kcalPer100g).toBeGreaterThanOrEqual(0);
      expect(f.servingGrams).toBeGreaterThan(0);
    }
  });
});

describe("สารอาหารหลักในตารางเมนูอ้างอิง", () => {
  // แอลกอฮอล์ให้ 7 kcal/ก. ซึ่งไม่อยู่ในโปรตีน/คาร์บ/ไขมัน
  const ALCOHOLIC = new Set(["beer"]);

  it("พลังงานจากโปรตีน×4 + คาร์บ×4 + ไขมัน×9 ใกล้กับ kcal ในตาราง (±15%)", () => {
    for (const f of REFERENCE_FOODS.filter((f) => !ALCOHOLIC.has(f.key))) {
      const fromMacros = f.proteinPer100g * 4 + f.carbPer100g * 4 + f.fatPer100g * 9;
      expect(Math.abs(fromMacros - f.kcalPer100g), `${f.key}: ${fromMacros} vs ${f.kcalPer100g}`).toBeLessThanOrEqual(
        Math.max(f.kcalPer100g * 0.15, 5),
      );
    }
  });

  it("เครื่องดื่มที่ปรับหวานได้มีคาร์บพอให้หักน้ำตาลออกจนไม่หวาน", () => {
    for (const f of REFERENCE_FOODS.filter((f) => f.sugarKcalPer100g !== undefined)) {
      expect(f.carbPer100g * 4, f.key).toBeGreaterThanOrEqual(f.sugarKcalPer100g!);
    }
  });
});

describe("ผลไม้ ไอศกรีม และหน่วยเสิร์ฟ", () => {
  it("ชื่อและชื่อเรียกอื่นไม่ชนกันข้ามเมนู", () => {
    const owner = new Map<string, string>();
    for (const f of REFERENCE_FOODS) {
      for (const name of new Set([f.name_th, f.name_en, ...f.aliases].map((n) => n.toLowerCase().replace(/\s+/g, "")))) {
        expect(owner.get(name) ?? f.key, `"${name}" ซ้ำใน ${owner.get(name)} และ ${f.key}`).toBe(f.key);
        owner.set(name, f.key);
      }
    }
  });

  it("ค้นเจอผลไม้และไอศกรีมจากชื่อที่คนเรียก", () => {
    expect(findReference(null, "ไอติมกะทิ", "")?.key).toBe("coconut_ice_cream");
    expect(findReference(null, "ไอติม", "")?.key).toBe("ice_cream");
    expect(findReference(null, "ทุเรียนหมอนทอง", "")?.key).toBe("durian");
    expect(searchReferences("ไอศกรีม").length).toBeGreaterThanOrEqual(5);
  });

  it("หน่วยเสิร์ฟ: ใช้ของเมนูอ้างอิง ไม่งั้นเป็นจานหรือแก้ว", () => {
    const scoop = itemFromReference(REFERENCE_FOODS.find((f) => f.key === "ice_cream")!);
    expect(servingUnitOf(scoop)).toBe("สกู๊ป");
    expect(itemKcal(withPortion(scoop, 1.5))).toBe(203); // 98 ก. × 207 / 100 = 202.9
    expect(servingUnitOf(itemFromReference(REFERENCE_FOODS.find((f) => f.key === "durian")!))).toBe("พู");
    expect(servingUnitOf(itemFromAi(ai()))).toBe("จาน");
    expect(servingUnitOf(itemFromReference(REFERENCE_FOODS.find((f) => f.key === "latte")!))).toBe("แก้ว");
  });
});

describe("computeKcal", () => {
  it("กรัม × kcal ต่อ 100 กรัม / 100 แล้วปัดเศษ", () => {
    expect(computeKcal(160, 130)).toBe(208);
    expect(computeKcal(55, 196)).toBe(108);
    expect(computeKcal(0, 500)).toBe(0);
  });
});

describe("findReference", () => {
  it("ใช้ matchKey ก่อน", () => {
    expect(findReference("fried_egg", "อะไรก็ได้", "")?.key).toBe("fried_egg");
  });
  it("matchKey ผิด → เทียบชื่อไทย ชื่ออังกฤษ หรือชื่อเรียกอื่น", () => {
    expect(findReference("nope", "ข้าวสวย", "")?.key).toBe("rice_white");
    expect(findReference(null, "xxx", "Pad Thai")?.key).toBe("pad_thai");
    expect(findReference(null, "ส้มตำ", "")?.key).toBe("som_tam");
    expect(findReference(null, "ข้าว สวย", "")?.key).toBe("rice_white");
  });
  it("ไม่ตรงเลย → undefined", () => {
    expect(findReference(null, "ชาไทยปั่นวิปครีม", "Blended Thai tea")).toBeUndefined();
  });
});

describe("itemFromAi", () => {
  it("ตรงกับเมนูอ้างอิง → ใช้ตัวเลขจากตาราง ไม่ใช่ที่ AI เดา", () => {
    const item = itemFromAi(ai());
    expect(item).toMatchObject({ refKey: "rice_white", estimated: false, grams: 200, servingGrams: 160 });
    expect(itemKcal(item)).toBe(260);
  });
  it("ไม่ตรง → ค่าประมาณการจาก AI และปรับปริมาณแล้วคิดตามสัดส่วน", () => {
    const item = itemFromAi(ai({ name_th: "ชาไทยปั่น", name_en: "", matchKey: null, grams: 400, kcal_estimate: 380 }));
    expect(item).toMatchObject({ refKey: null, estimated: true, servingGrams: 400 });
    expect(itemKcal(item)).toBe(380);
    expect(itemKcal(withPortion(item, 0.5))).toBe(190);
  });
});

describe("การแก้ปริมาณ", () => {
  const item = itemFromAi(ai({ confidence: 0.3 }));
  it("ปุ่มลัด ½/1/1½ จานคิดจากกรัมต่อจาน", () => {
    expect(withPortion(item, 0.5).grams).toBe(80);
    expect(withPortion(item, 1.5).grams).toBe(240);
  });
  it("ผู้ใช้แก้แล้ว = มั่นใจเต็ม", () => {
    expect(withPortion(item, 1).confidence).toBe(1);
    expect(withGrams(item, 123.4)).toMatchObject({ grams: 123, confidence: 1 });
    expect(withGrams(item, -10).grams).toBe(0);
  });
  it("เปลี่ยนเมนูคงปริมาณและ id เดิม", () => {
    const egg = REFERENCE_FOODS.find((f) => f.key === "fried_egg")!;
    const next = replaceWithReference(item, egg);
    expect(next).toMatchObject({ id: item.id, refKey: "fried_egg", grams: 200, estimated: false, confidence: 1 });
  });
  it("รวมแคลอรี่", () => {
    expect(sumItems([item, withGrams(item, 100)])).toBe(260 + 130);
  });
});

describe("เครื่องดื่มและระดับความหวาน", () => {
  it("เครื่องดื่มจากตาราง: หวานปกติเป็นค่าเริ่มต้น และปรับความหวานแล้วแคลอรี่เปลี่ยน", () => {
    const tea = itemFromAi(ai({ name_th: "ชาเย็น", matchKey: "thai_tea", grams: 300, is_drink: false }));
    expect(tea).toMatchObject({ kind: "drink", sweetness: "normal", sugarKcalPer100g: 45 });
    expect(canAdjustSweetness(tea)).toBe(true);
    expect(itemKcal(tea)).toBe(255); // 300 × 85 / 100
    expect(itemKcal(withSweetness(tea, "none"))).toBe(120); // 300 × 40 / 100
    expect(itemKcal(withSweetness(tea, "less"))).toBe(188); // 300 × 62.5 / 100
    expect(itemKcal(withSweetness(tea, "extra"))).toBe(323); // 300 × 107.5 / 100
  });

  it("อเมริกาโน่เริ่มที่ไม่หวาน", () => {
    const coffee = itemFromReference(REFERENCE_FOODS.find((f) => f.key === "americano")!);
    expect(coffee.sweetness).toBe("none");
    expect(itemKcal(coffee)).toBe(6); // 300 × 2 / 100
    expect(itemKcal(withSweetness(coffee, "normal"))).toBe(51);
  });

  it("เครื่องดื่มที่ไม่มีน้ำตาลเติม (น้ำเปล่า นมจืด) ปรับความหวานไม่ได้", () => {
    const water = itemFromReference(REFERENCE_FOODS.find((f) => f.key === "water")!);
    expect(water.kind).toBe("drink");
    expect(canAdjustSweetness(water)).toBe(false);
    expect(withSweetness(water, "extra")).toBe(water);
  });

  it("เครื่องดื่มประมาณการ: ถือว่าราว 40% เป็นน้ำตาล", () => {
    const shake = itemFromAi(ai({ name_th: "ชาไทยปั่น", name_en: "", matchKey: null, grams: 300, kcal_estimate: 300, is_drink: true }));
    expect(shake).toMatchObject({ kind: "drink", estimated: true, sweetness: "normal" });
    expect(itemKcal(shake)).toBe(300);
    expect(itemKcal(withSweetness(shake, "none"))).toBe(180);
  });

  it("อาหารไม่มีระดับความหวาน และข้อมูลเก่าที่ไม่มี kind ยังคำนวณได้", () => {
    const rice = itemFromAi(ai());
    expect(rice.kind).toBe("food");
    expect(canAdjustSweetness(rice)).toBe(false);
    const legacy = { ...rice, kind: undefined, sweetness: undefined, sugarKcalPer100g: undefined };
    expect(itemKcal(legacy)).toBe(260);
  });

  it("ทุกเครื่องดื่มในตารางมีค่าน้ำตาลไม่เกินแคลอรี่รวม", () => {
    for (const f of REFERENCE_FOODS.filter((f) => f.sugarKcalPer100g !== undefined)) {
      expect(f.kind).toBe("drink");
      expect(f.sugarKcalPer100g!).toBeLessThanOrEqual(f.kcalPer100g);
    }
  });
});

describe("searchReferences", () => {
  it("ค้นจากชื่อไทย อังกฤษ และชื่อเรียกอื่น", () => {
    expect(searchReferences("กะเพรา").map((f) => f.key)).toContain("kaprao_moo_sap");
    expect(searchReferences("latte").map((f) => f.key)).toContain("latte");
    expect(searchReferences("โอเลี้ยง").map((f) => f.key)).toEqual(["iced_coffee"]);
  });
});

describe("guessMeal / dateKey", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 26, h, m);
  it("เดามื้อจากเวลา", () => {
    expect(guessMeal(at(7))).toBe("breakfast");
    expect(guessMeal(at(11, 30))).toBe("lunch");
    expect(guessMeal(at(14))).toBe("snack");
    expect(guessMeal(at(18))).toBe("dinner");
    expect(guessMeal(at(23))).toBe("snack");
  });
  it("dateKey ตามเวลาท้องถิ่น", () => {
    expect(dateKey(at(0, 5))).toBe("2026-10-26");
  });
});

describe("สารอาหารหลักของรายการอาหาร", () => {
  const ref = (key: string) => REFERENCE_FOODS.find((f) => f.key === key)!;

  it("คิดตามกรัมที่กิน", () => {
    // ข้าวสวย 200 ก.: โปรตีน 2.7, คาร์บ 28.2, ไขมัน 0.3 ต่อ 100 ก.
    const m = itemMacros(itemFromReference(ref("rice_white"), 200))!;
    expect(m.protein).toBeCloseTo(5.4);
    expect(m.carb).toBeCloseTo(56.4);
    expect(m.fat).toBeCloseTo(0.6);
  });

  it("ลดความหวานแล้วคาร์บลดตามน้ำตาลที่หักออก (4 kcal ต่อกรัม)", () => {
    // ชาเย็น 300 มล. คาร์บ 14.5/100 มล., น้ำตาล 45 kcal/100 มล. → ไม่หวาน: 14.5 − 45/4 = 3.25
    const tea = itemFromReference(ref("thai_tea"), 300);
    expect(itemMacros(tea)!.carb).toBeCloseTo(43.5);
    expect(itemMacros(withSweetness(tea, "none"))!.carb).toBeCloseTo(9.75);
    expect(itemMacros(withSweetness(tea, "none"))!.protein).toBeCloseTo(3.6);
  });

  it("ค่าประมาณการจาก AI ไม่มีสารอาหาร → ไม่ทราบ", () => {
    expect(itemMacros(itemFromAi(ai({ name_th: "ชาไทยปั่น", name_en: "", matchKey: null })))).toBeNull();
  });

  it("รวมทั้งวัน: ปัดเป็นกรัม และนับรายการที่ไม่ทราบค่า", () => {
    const items = [
      itemFromReference(ref("rice_white"), 200),
      itemFromReference(ref("fried_egg"), 50), // 6.8 / 0.4 / 7.65
      itemFromAi(ai({ name_th: "ชาไทยปั่น", name_en: "", matchKey: null })),
    ];
    expect(sumMacros(items)).toEqual({ protein: 12, carb: 57, fat: 8, unknown: 1 });
  });
});
