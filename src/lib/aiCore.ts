import type { AiProvider, AnalyzeErrorCode } from "./types";

export interface AnalyzerResult {
  /** ข้อความดิบ (JSON) จากโมเดล */
  text: string;
  /** โมเดลที่ตอบจริง (อาจต่างจากที่ขอ เมื่อสลับไปตัวสำรอง) */
  model: string;
}

/** ตัววิเคราะห์รูปอาหาร แยกไว้เพื่อสลับผู้ให้บริการได้ */
export interface FoodAnalyzer {
  analyze(imageBase64: string, options: { model: string; signal: AbortSignal }): Promise<AnalyzerResult>;
}

export class AnalyzerError extends Error {
  constructor(
    public code: AnalyzeErrorCode,
    message: string,
    /** ปัญหาเฉพาะโมเดล/ผู้ให้บริการต้นทาง ลองโมเดลอื่นได้ */
    public retryable = false,
  ) {
    super(message);
  }
}

export interface AiHealth {
  provider: AiProvider;
  mock: boolean;
  reachable: boolean;
  /** ข้อความสถานะภาษาไทยเมื่อเชื่อมต่อไม่ได้ */
  message?: string;
  /** โมเดลที่เลือกได้ (Ollama = ที่ติดตั้งแล้ว, OpenRouter = โมเดลฟรีที่ดูรูปได้) */
  models: string[];
  defaultModel: string;
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
}
