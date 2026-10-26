import { describe, expect, it } from "vitest";
import { AiOutputError, parseAiOutput } from "./schema";

const item = { name_th: "ข้าวสวย", name_en: "Steamed rice", matchKey: "rice_white", grams: 160, confidence: 0.9, kcal_estimate: 210 };

describe("parseAiOutput", () => {
  it("อ่านรูปแบบ { items: [...] } ปกติ", () => {
    const result = parseAiOutput(JSON.stringify({ items: [item] }));
    expect(result.items).toEqual([{ ...item, is_drink: false }]);
    expect(result.dropped).toBe(0);
  });

  it("รับ array เปล่าๆ และ code fence", () => {
    const result = parseAiOutput("```json\n" + JSON.stringify([item]) + "\n```");
    expect(result.items).toHaveLength(1);
  });

  it("ตัดข้อความที่โมเดลแถมมาก่อน/หลัง JSON", () => {
    const result = parseAiOutput(`นี่คือผลลัพธ์: ${JSON.stringify({ items: [item] })} หวังว่าจะช่วยได้`);
    expect(result.items[0].name_th).toBe("ข้าวสวย");
  });

  it("แปลงตัวเลขที่เป็น string และเปอร์เซ็นต์ความมั่นใจ", () => {
    const result = parseAiOutput(JSON.stringify({ items: [{ ...item, grams: "150", confidence: 85, kcal_estimate: "200" }] }));
    expect(result.items[0]).toMatchObject({ grams: 150, confidence: 0.85, kcal_estimate: 200 });
  });

  it("matchKey ว่างหรือไม่มี = null", () => {
    const { matchKey: _omit, ...noKey } = item;
    const result = parseAiOutput(JSON.stringify({ items: [{ ...item, matchKey: "" }, noKey] }));
    expect(result.items.map((i) => i.matchKey)).toEqual([null, null]);
  });

  it("ข้ามรายการที่เพี้ยนแต่เก็บรายการที่ดีไว้", () => {
    const result = parseAiOutput(JSON.stringify({ items: [item, { name_th: "", grams: 10 }, { name_th: "ไข่", grams: -5 }, "oops"] }));
    expect(result.items).toHaveLength(1);
    expect(result.dropped).toBe(3);
  });

  it("ค่าที่ไม่จำเป็นแต่เพี้ยนจะใช้ค่าเริ่มต้น", () => {
    const result = parseAiOutput(JSON.stringify({ items: [{ name_th: "ส้มตำ", grams: 200, confidence: "?", kcal_estimate: null }] }));
    expect(result.items[0]).toMatchObject({ name_en: "", confidence: 0.5, kcal_estimate: 0 });
  });

  it("is_drink: รับ boolean และ string, ค่าอื่นถือว่าไม่ใช่เครื่องดื่ม", () => {
    const parse = (is_drink: unknown) => parseAiOutput(JSON.stringify({ items: [{ ...item, is_drink }] })).items[0].is_drink;
    expect(parse(true)).toBe(true);
    expect(parse("true")).toBe(true);
    expect(parse("false")).toBe(false);
    expect(parse("yes")).toBe(false);
    expect(parse(undefined)).toBe(false);
  });

  it("รายการว่างได้", () => {
    expect(parseAiOutput('{"items": []}').items).toEqual([]);
  });

  it("โยน AiOutputError เมื่อไม่ใช่ JSON หรือไม่มีรายการ", () => {
    expect(() => parseAiOutput("ขอโทษ ฉันไม่เห็นอาหาร")).toThrow(AiOutputError);
    expect(() => parseAiOutput('{"items": [ {"name_th": ')).toThrow(AiOutputError);
    expect(() => parseAiOutput('{"foods": 3}')).toThrow(AiOutputError);
  });
});
