import { z } from "zod";

/** รายการอาหารหนึ่งรายการตามที่ AI ตอบ */
export const aiItemSchema = z.object({
  name_th: z.string().trim().min(1),
  name_en: z.string().trim().catch(""),
  matchKey: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null)),
  grams: z.coerce.number().positive().finite(),
  confidence: z.coerce
    .number()
    .finite()
    .catch(0.5)
    // บางโมเดลตอบเป็นเปอร์เซ็นต์ (เช่น 85)
    .transform((v) => Math.min(1, Math.max(0, v > 1 ? v / 100 : v))),
  kcal_estimate: z.coerce.number().nonnegative().finite().catch(0),
  is_drink: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .catch(false),
});

export type AiItem = z.infer<typeof aiItemSchema>;

/** JSON schema ที่ส่งให้ Ollama ผ่าน `format` เพื่อบังคับรูปแบบคำตอบ */
export const AI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name_th: { type: "string" },
          name_en: { type: "string" },
          matchKey: { type: "string" },
          grams: { type: "number" },
          confidence: { type: "number" },
          kcal_estimate: { type: "number" },
          is_drink: { type: "boolean" },
        },
        required: ["name_th", "name_en", "grams", "confidence", "kcal_estimate"],
      },
    },
  },
  required: ["items"],
} as const;

export interface ParsedAiOutput {
  items: AiItem[];
  /** จำนวนรายการที่รูปแบบเพี้ยนจนใช้ไม่ได้ */
  dropped: number;
}

export class AiOutputError extends Error {}

function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(text);
  } catch {
    // ตัดข้อความนำหน้า/ต่อท้ายที่โมเดลแถมมา
    const start = text.search(/[[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start === -1 || end <= start) throw new AiOutputError("ไม่พบ JSON ในคำตอบของ AI");
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      throw new AiOutputError("JSON จาก AI ไม่สมบูรณ์");
    }
  }
}

/** แปลงคำตอบดิบของ AI เป็นรายการที่ตรวจแล้ว โดยข้ามรายการที่เพี้ยนทีละรายการ */
export function parseAiOutput(raw: string): ParsedAiOutput {
  const data = extractJson(raw);
  const list: unknown = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "items" in data
      ? (data as { items: unknown }).items
      : null;
  if (!Array.isArray(list)) throw new AiOutputError("คำตอบของ AI ไม่มีรายการอาหาร");

  const items: AiItem[] = [];
  let dropped = 0;
  for (const entry of list) {
    const result = aiItemSchema.safeParse(entry);
    if (result.success) items.push(result.data);
    else dropped++;
  }
  return { items, dropped };
}
