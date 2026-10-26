import { AnalyzerError, isAbort, type FoodAnalyzer } from "./aiCore";
import { AI_RESPONSE_JSON_SCHEMA } from "./schema";
import { SYSTEM_PROMPT, USER_PROMPT } from "./prompt";

export const OLLAMA_URL = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");
export const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5vl:3b";
/** โมเดล vision ที่แนะนำสำหรับ GPU 4 GB */
export const OLLAMA_SUGGESTED_MODELS = ["qwen2.5vl:3b", "gemma3:4b"];

export const ollamaAnalyzer: FoodAnalyzer = {
  async analyze(imageBase64, { model, signal }) {
    let res: Response;
    try {
      res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: AI_RESPONSE_JSON_SCHEMA,
          options: { temperature: 0.1 },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: USER_PROMPT, images: [imageBase64] },
          ],
        }),
      });
    } catch (error) {
      if (isAbort(error)) throw error;
      throw new AnalyzerError("unreachable", "เชื่อมต่อ Ollama ไม่ได้ กรุณาเปิดโปรแกรม Ollama บนคอมพิวเตอร์แล้วลองใหม่");
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 404 || /not found/i.test(detail)) {
        throw new AnalyzerError("model_missing", `ยังไม่มีโมเดล ${model} ในเครื่อง กรุณารันคำสั่ง: ollama pull ${model}`);
      }
      throw new AnalyzerError("unreachable", `Ollama ตอบกลับผิดพลาด (${res.status})`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    return { text: data.message?.content ?? "", model };
  },
};

export async function listOllamaModels(): Promise<string[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}
