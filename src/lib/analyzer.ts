import type { AiHealth, FoodAnalyzer } from "./aiCore";
import { listOllamaModels, ollamaAnalyzer, OLLAMA_DEFAULT_MODEL, OLLAMA_SUGGESTED_MODELS } from "./ollama";
import { checkOpenRouter, openRouterAnalyzer, OPENROUTER_DEFAULT_MODEL } from "./openrouter";
import type { AiProvider } from "./types";

/** AI_PROVIDER กำหนดเอง หรือถ้ามี OPENROUTER_API_KEY ให้ใช้ OpenRouter */
export const PROVIDER: AiProvider =
  process.env.AI_PROVIDER === "openrouter" || process.env.AI_PROVIDER === "ollama"
    ? process.env.AI_PROVIDER
    : process.env.OPENROUTER_API_KEY
      ? "openrouter"
      : "ollama";

/** OLLAMA_MOCK=1 (ชื่อเดิม) หรือ AI_MOCK=1 = ใช้ผลจำลอง */
export const MOCK_MODE = process.env.AI_MOCK === "1" || process.env.OLLAMA_MOCK === "1";

export const DEFAULT_MODEL = PROVIDER === "openrouter" ? OPENROUTER_DEFAULT_MODEL : OLLAMA_DEFAULT_MODEL;

/** ใช้โมเดลที่ผู้ใช้เลือกถ้าเป็นของผู้ให้บริการเดียวกัน (OpenRouter มี "/" ในชื่อ) */
export function resolveModel(requested: string | undefined): string {
  if (!requested) return DEFAULT_MODEL;
  const isOpenRouterId = requested.includes("/");
  return isOpenRouterId === (PROVIDER === "openrouter") ? requested : DEFAULT_MODEL;
}

const MOCK_RESPONSE = JSON.stringify({
  items: [
    { name_th: "กะเพราหมูสับ", name_en: "Stir-fried basil pork", matchKey: "kaprao_moo_sap", grams: 150, confidence: 0.86, kcal_estimate: 270 },
    { name_th: "ข้าวสวย", name_en: "Steamed rice", matchKey: "rice_white", grams: 180, confidence: 0.92, kcal_estimate: 234 },
    { name_th: "ไข่ดาว", name_en: "Fried egg", matchKey: "fried_egg", grams: 50, confidence: 0.45, kcal_estimate: 98 },
    { name_th: "ชาไทยปั่นวิปครีม", name_en: "Blended Thai tea with whipped cream", matchKey: "", grams: 300, confidence: 0.7, kcal_estimate: 300, is_drink: true },
  ],
});

/** ผลจำลองสำหรับลองแอปโดยไม่ต้องเรียก AI จริง */
const mockAnalyzer: FoodAnalyzer = {
  analyze(_image, { model, signal }) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({ text: MOCK_RESPONSE, model }), 2500);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
  },
};

export function getAnalyzer(): FoodAnalyzer {
  if (MOCK_MODE) return mockAnalyzer;
  return PROVIDER === "openrouter" ? openRouterAnalyzer : ollamaAnalyzer;
}

function withDefaultFirst(models: string[]): string[] {
  return [DEFAULT_MODEL, ...models.filter((m) => m !== DEFAULT_MODEL)];
}

export async function checkHealth(): Promise<AiHealth> {
  const base = { provider: PROVIDER, defaultModel: DEFAULT_MODEL };

  if (PROVIDER === "openrouter") {
    const result = await checkOpenRouter();
    return { ...base, mock: MOCK_MODE, ...result, reachable: MOCK_MODE || result.reachable, models: withDefaultFirst(result.models) };
  }

  if (MOCK_MODE) return { ...base, mock: true, reachable: true, models: OLLAMA_SUGGESTED_MODELS };
  const installed = await listOllamaModels();
  if (!installed) {
    return { ...base, mock: false, reachable: false, message: "เชื่อมต่อ Ollama ไม่ได้ — เปิดโปรแกรม Ollama แล้วลองใหม่", models: OLLAMA_SUGGESTED_MODELS };
  }
  // แสดงโมเดลที่แนะนำทุกตัว แล้วบอกว่าตัวไหนยังไม่ได้ติดตั้ง
  const missing = OLLAMA_SUGGESTED_MODELS.filter((m) => !installed.some((i) => i === m || i === `${m}:latest`));
  return {
    ...base,
    mock: false,
    reachable: true,
    message: missing.length ? `ยังไม่ได้ติดตั้ง: ${missing.join(", ")} (รัน ollama pull <ชื่อโมเดล>)` : undefined,
    models: withDefaultFirst(OLLAMA_SUGGESTED_MODELS),
  };
}
