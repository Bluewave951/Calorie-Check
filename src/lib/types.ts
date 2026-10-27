// คำศัพท์ตาม GLOSSARY.md: มื้อ (Meal) ⊃ การสแกน (Scan) ⊃ รายการอาหาร (Food Item)

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "เช้า",
  lunch: "กลางวัน",
  dinner: "เย็น",
  snack: "ว่าง",
};

/** ชื่อรองภาษาอังกฤษใต้หัวข้อมื้อ */
export const MEAL_LABEL_EN: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
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
  /** สารอาหารหลัก กรัมต่อ 100 กรัม (ค่าประมาณ; คาร์บรวมน้ำตาลที่ความหวานปกติ) */
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
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
  /** ไม่มีค่า = ไม่ทราบ (ค่าประมาณการจาก AI หรือข้อมูลก่อนมีสารอาหาร) */
  proteinPer100g?: number;
  carbPer100g?: number;
  fatPer100g?: number;
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

export type Sex = "male" | "female";

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const SEX_LABEL: Record<Sex, string> = { male: "ชาย", female: "หญิง" };

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "นั่งทำงาน แทบไม่ออกกำลังกาย",
  light: "ออกกำลังกายเบา ๆ 1–3 วัน/สัปดาห์",
  moderate: "ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์",
  active: "ออกกำลังกายหนัก 6–7 วัน/สัปดาห์",
  very_active: "ใช้แรงงานหรือฝึกหนักวันละ 2 ครั้ง",
};

export const WEIGHT_GOALS = ["lose", "maintain", "gain"] as const;
export type WeightGoal = (typeof WEIGHT_GOALS)[number];

export const WEIGHT_GOAL_LABEL: Record<WeightGoal, string> = { lose: "ลดน้ำหนัก", maintain: "คงน้ำหนัก", gain: "เพิ่มน้ำหนัก" };

/** ข้อมูลร่างกาย: ใช้คำนวณ TDEE เพื่อแนะนำเป้าแคลอรี่ */
export interface BodyProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  weightGoal: WeightGoal;
}

/** น้ำหนักตัวที่ชั่งในวันหนึ่ง (วันละค่าเดียว ชั่งซ้ำ = แทนค่าเดิม) */
export interface WeightEntry {
  /** วันที่ตามเวลาท้องถิ่น YYYY-MM-DD */
  date: string;
  weightKg: number;
}

/** การเตือนเมื่อกินยังไม่ครบเป้าแคลอรี่ */
export interface ReminderSettings {
  enabled: boolean;
  /** ชั่วโมงที่เริ่มเตือน 0–23 ตามเวลาท้องถิ่น */
  hour: number;
}

export const LOSS_RATES = [0.25, 0.5, 0.75] as const;
/** กก. ที่ตั้งใจลดต่อสัปดาห์ */
export type LossRate = (typeof LOSS_RATES)[number];

/** โปรแกรมลดน้ำหนัก: จากน้ำหนักเริ่มต้นไปถึงน้ำหนักเป้าหมายด้วยอัตราคงที่ */
export interface WeightProgram {
  /** วันเริ่มโปรแกรม YYYY-MM-DD */
  startDate: string;
  startWeightKg: number;
  targetWeightKg: number;
  ratePerWeek: LossRate;
}

export interface Settings {
  dailyGoal: number;
  /** ว่าง = ใช้โมเดลเริ่มต้นของเซิร์ฟเวอร์ */
  model: string;
  /** ผู้ใช้ตั้งเป้าเองแล้ว (ไม่ต้องแสดงคำแนะนำให้ตั้งเป้า) */
  goalConfirmed?: boolean;
  /** ข้อมูลร่างกายที่กรอกในตัวช่วยคำนวณ TDEE (ไม่มี = ยังไม่เคยกรอก) */
  profile?: BodyProfile;
  /** เวลาที่ข้อมูลเริ่มเปลี่ยนหลังส่งออกไฟล์สำรองครั้งล่าสุด (ไม่มี = ไม่มีข้อมูลค้าง) */
  unbackedSince?: number;
  /** ไม่มี = เปิดเตือนตามค่าเริ่มต้น */
  reminder?: ReminderSettings;
  /** ไม่มี = ยังไม่ได้เริ่มโปรแกรมลดน้ำหนัก */
  program?: WeightProgram;
}

/** ช่วงเป้าแคลอรี่ที่แอปรองรับ */
export const MIN_GOAL = 800;
export const MAX_GOAL = 6000;

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
