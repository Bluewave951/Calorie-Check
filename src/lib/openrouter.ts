import { AnalyzerError, isAbort, type FoodAnalyzer } from "./aiCore";
import { SYSTEM_PROMPT, USER_PROMPT } from "./prompt";

const API = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free";
/** จำนวนโมเดลฟรีสูงสุดที่ลองต่อหนึ่งรูป (รวมตัวที่เลือก) */
const MAX_ATTEMPTS = 4;

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new AnalyzerError("auth", "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ในไฟล์ .env.local");
  return key;
}

function headers(key: string): HeadersInit {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Title": "Calorie&Check",
  };
}

interface OpenRouterError {
  error?: { code?: number | string; message?: string; metadata?: { raw?: string } };
}

function toAnalyzerError(status: number, detail: string, model: string): AnalyzerError {
  if (status === 401 || status === 403) return new AnalyzerError("auth", "API key ของ OpenRouter ไม่ถูกต้องหรือถูกปิดใช้งาน");
  if (status === 402) return new AnalyzerError("rate_limited", "เครดิต OpenRouter ไม่พอ ลองเลือกโมเดลที่ลงท้ายด้วย :free");
  if (status === 429) return new AnalyzerError("rate_limited", `${model} มีผู้ใช้เต็มโควตาชั่วคราว`);
  if (status === 404 || /no endpoints|not a valid model|not found/i.test(detail))
    return new AnalyzerError("model_missing", `ไม่พบโมเดล ${model} บน OpenRouter (โมเดลฟรีอาจถูกถอดออก)`);
  // 5xx = ผู้ให้บริการต้นทางของโมเดลนั้นล่ม → ลองโมเดลอื่นได้
  return new AnalyzerError("unreachable", `OpenRouter ตอบกลับผิดพลาด (${status})`, status >= 500);
}

const MODEL_CACHE_MS = 10 * 60_000;
let modelCache: { at: number; models: string[] } | null = null;

/** โมเดลที่เพิ่งเต็มโควตา → ข้ามไปก่อนสักพัก เพื่อไม่ต้องรอให้ปฏิเสธซ้ำทุกรูป */
const COOLDOWN_MS = 3 * 60_000;
const coolingUntil = new Map<string, number>();

/** ล้างสถานะที่จำไว้ (ใช้ใน test) */
export function resetOpenRouterState() {
  coolingUntil.clear();
  modelCache = null;
}

function isCooling(model: string): boolean {
  return (coolingUntil.get(model) ?? 0) > Date.now();
}

/** ข้อผิดพลาดที่ควรลองโมเดลฟรีตัวถัดไป */
function shouldTryNext(error: AnalyzerError): boolean {
  return error.retryable || error.code === "rate_limited" || error.code === "model_missing" || error.code === "bad_output";
}

async function callModel(key: string, model: string, imageBase64: string, signal: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: headers(key),
      signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        // json_object รองรับกว้างกว่า json_schema ในโมเดลฟรี; รูปแบบละเอียดอยู่ใน prompt และตรวจด้วย zod อีกชั้น
        response_format: { type: "json_object" },
        // โมเดลแบบ reasoning: คิดสั้นๆ และไม่ต้องส่งความคิดกลับมา
        reasoning: { effort: "low", exclude: true },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new AnalyzerError("unreachable", "เชื่อมต่อ OpenRouter ไม่ได้ ตรวจการเชื่อมต่ออินเทอร์เน็ตของคอมพิวเตอร์");
  }

  if (!res.ok) throw toAnalyzerError(res.status, await res.text().catch(() => ""), model);

  const data = (await res.json()) as OpenRouterError & {
    choices?: { message?: { content?: string | { type: string; text?: string }[] | null } }[];
  };
  // บางครั้งส่ง error มากับ HTTP 200
  if (data.error) throw toAnalyzerError(Number(data.error.code) || 500, data.error.metadata?.raw ?? data.error.message ?? "", model);

  const content = data.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((part) => part.text ?? "").join("") : (content ?? "");
  if (!text.trim()) throw new AnalyzerError("bad_output", `${model} ไม่ได้ส่งคำตอบกลับมา`);
  return text;
}

export const openRouterAnalyzer: FoodAnalyzer = {
  async analyze(imageBase64, { model, signal }) {
    const key = apiKey();
    // สลับไปโมเดลฟรีตัวอื่นเฉพาะเมื่อตัวที่เลือกเป็นของฟรี เพื่อไม่ให้เกิดค่าใช้จ่ายโดยไม่ตั้งใจ
    const fallbacks = model.endsWith(":free") ? await listFreeVisionModels() : [];
    const all = [model, ...fallbacks.filter((m) => m !== model)];
    // ตัวที่กำลังพักโควตาไปไว้ท้ายสุด (ยังลองได้ถ้าตัวอื่นไม่ว่างทั้งหมด)
    const candidates = [...all.filter((m) => !isCooling(m)), ...all.filter(isCooling)].slice(0, MAX_ATTEMPTS);

    const failures: AnalyzerError[] = [];
    for (const candidate of candidates) {
      try {
        const text = await callModel(key, candidate, imageBase64, signal);
        coolingUntil.delete(candidate);
        return { text, model: candidate };
      } catch (error) {
        if (!(error instanceof AnalyzerError) || !shouldTryNext(error)) throw error;
        if (error.code === "rate_limited") coolingUntil.set(candidate, Date.now() + COOLDOWN_MS);
        failures.push(error);
      }
    }

    if (failures.every((f) => f.code === "rate_limited")) {
      throw new AnalyzerError(
        "rate_limited",
        candidates.length > 1
          ? `โมเดลฟรีที่ลองทั้ง ${candidates.length} ตัวมีผู้ใช้เต็มโควตาชั่วคราว รอ 1–2 นาทีแล้วลองใหม่`
          : failures[0].message,
      );
    }
    throw failures.at(-1)!;
  },
};

interface ModelInfo {
  id: string;
  architecture?: { input_modalities?: string[] };
}


/** โมเดลฟรีที่ดูรูปได้ (รายชื่อเปลี่ยนบ่อย จึงดึงสดและจำไว้ 10 นาที) */
export async function listFreeVisionModels(): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.models;
  try {
    const res = await fetch(`${API}/models`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return modelCache?.models ?? [];
    const models = ((await res.json()) as { data: ModelInfo[] }).data
      .filter((m) => m.id.endsWith(":free") && m.architecture?.input_modalities?.includes("image"))
      // โมเดลตรวจเนื้อหา (safety/guard) ไม่ได้ตอบคำถามทั่วไป
      .filter((m) => !/safety|guard/i.test(m.id))
      .map((m) => m.id);
    modelCache = { at: Date.now(), models };
    return models;
  } catch {
    return modelCache?.models ?? [];
  }
}

/** ตรวจ API key และดึงรายชื่อโมเดลฟรีที่ดูรูปได้ */
export async function checkOpenRouter(): Promise<{ reachable: boolean; message?: string; models: string[] }> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return { reachable: false, message: "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ในไฟล์ .env.local", models: [] };
  try {
    const [keyRes, models] = await Promise.all([
      fetch(`${API}/key`, { headers: headers(key), signal: AbortSignal.timeout(8000) }),
      listFreeVisionModels(),
    ]);
    if (keyRes.status === 401 || keyRes.status === 403) {
      return { reachable: false, message: "API key ของ OpenRouter ไม่ถูกต้อง", models };
    }
    if (!keyRes.ok) return { reachable: false, message: `OpenRouter ตอบกลับผิดพลาด (${keyRes.status})`, models };
    return { reachable: true, models };
  } catch {
    return { reachable: false, message: "เชื่อมต่อ OpenRouter ไม่ได้ ตรวจอินเทอร์เน็ต", models: [] };
  }
}
