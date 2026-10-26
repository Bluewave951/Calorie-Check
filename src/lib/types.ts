// คำศัพท์ตาม GLOSSARY.md: มื้อ (Meal) ⊃ การสแกน (Scan) ⊃ รายการอาหาร (Food Item)

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "เช้า",
  lunch: "กลางวัน",
  dinner: "เย็น",
  snack: "ว่าง",
};

export type FoodKind = "food" | "drink";

export const SWEETNESS_LEVELS = ["none", "less", "normal", "extra"] as const;
export type Sweetness = (typeof SWEETNESS_LEVELS)[number];

export const SWEETNESS_LABEL: Record<Sweetness, string> = {
  none: "ไม่หวาน",
  less: "หวานน้อย",
  normal: "ปกติ",
  extra: "หวานมาก",
};

/** เมนูอ้างอิง: แถวในตารางโภชนาการของแอป (เครื่องดื่ม: กรัม ≈ มิลลิลิตร) */
export interface ReferenceFood {
  key: string;
  name_th: string;
  name_en: string;
  /** kcal ต่อ 100 กรัม (เครื่องดื่มที่ปรับหวานได้ = ที่ความหวานปกติ) */
  kcalPer100g: number;
  servingGrams: number;
  aliases: string[];
  /** หน่วยของ 1 ที่เสิร์ฟ เช่น ลูก, สกู๊ป, พู (ไม่ระบุ = จาน หรือ แก้ว) */
  servingUnit?: string;
  kind?: FoodKind;
  /** ส่วนของ kcal ต่อ 100 มล. ที่มาจากน้ำตาลที่เติม ที่ความหวานปกติ — มีค่า = ปรับความหวานได้ */
  sugarKcalPer100g?: number;
  defaultSweetness?: Sweetness;
}

/** รายการอาหาร: เมนูหนึ่งอย่างที่พบในการสแกน */
export interface FoodItem {
  id: string;
  name_th: string;
  name_en: string;
  /** key ของเมนูอ้างอิง; null = ค่าประมาณการจาก AI */
  refKey: string | null;
  grams: number;
  /** กรัมของ 1 ที่เสิร์ฟ ใช้กับปุ่มลัด ½/1/1½ */
  servingGrams: number;
  servingUnit?: string;
  kcalPer100g: number;
  estimated: boolean;
  /** 0–1 ความมั่นใจของ AI (เพิ่มเองหรือแก้แล้ว = 1) */
  confidence: number;
  /** ไม่มีค่า (ข้อมูลเก่า) = อาหาร */
  kind?: FoodKind;
  /** มีค่า = เครื่องดื่มที่ปรับระดับความหวานได้ */
  sugarKcalPer100g?: number;
  sweetness?: Sweetness;
}

/** การสแกน: รูปหนึ่งรูปที่อยู่ในมื้อเดียว */
export interface Scan {
  id: string;
  /** วันที่ตามเวลาท้องถิ่น YYYY-MM-DD */
  date: string;
  meal: MealType;
  createdAt: number;
  /** รูปย่อ ~240px (data URL) */
  thumbnail: string | null;
  items: FoodItem[];
}

export interface Settings {
  dailyGoal: number;
  /** ว่าง = ใช้โมเดลเริ่มต้นของเซิร์ฟเวอร์ */
  model: string;
  /** ผู้ใช้ตั้งเป้าเองแล้ว (ไม่ต้องแสดงคำแนะนำให้ตั้งเป้า) */
  goalConfirmed?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 2000,
  model: "",
};

export type AiProvider = "ollama" | "openrouter";

export type AnalyzeErrorCode =
  | "unreachable"
  | "model_missing"
  | "auth"
  | "rate_limited"
  | "timeout"
  | "bad_output"
  | "bad_request";

export interface AnalyzeResponse {
  items: FoodItem[];
  model: string;
  ms: number;
}

export interface AnalyzeError {
  error: AnalyzeErrorCode;
  message: string;
  provider: AiProvider;
}
