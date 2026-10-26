import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzerError } from "./aiCore";
import { openRouterAnalyzer, resetOpenRouterState } from "./openrouter";

const PRIMARY = "google/gemma-4-31b-it:free";
const FREE_MODELS = [PRIMARY, "nvidia/nemotron-3.5-super-vl:free", "google/gemma-4-26b-a4b-it:free"];

const options = (model = PRIMARY) => ({ model, signal: new AbortController().signal });

const ok = (content: unknown) => ({ status: 200, body: { choices: [{ message: { content } }] } });

/** จำลอง OpenRouter: /models คืนรายชื่อโมเดลฟรี, /chat/completions ตอบตามโมเดลที่ขอ */
function mockOpenRouter(chat: (model: string) => { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/models")) {
      return Response.json({
        data: FREE_MODELS.map((id) => ({ id, architecture: { input_modalities: ["text", "image"] } })),
      });
    }
    const { model } = JSON.parse(init!.body as string) as { model: string };
    const { status, body } = chat(model);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  const chatModels = () =>
    fetchMock.mock.calls
      .filter(([url]) => url.endsWith("/chat/completions"))
      .map(([, init]) => (JSON.parse(init!.body as string) as { model: string }).model);
  return { fetchMock, chatModels };
}

async function codeOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AnalyzerError);
  return (error as AnalyzerError).code;
}

describe("openRouterAnalyzer", () => {
  beforeEach(() => {
    resetOpenRouterState();
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("ส่งรูปเป็น data URL พร้อม key และคืนข้อความกับโมเดลที่ตอบ", async () => {
    const { fetchMock } = mockOpenRouter(() => ok('{"items":[]}'));
    await expect(openRouterAnalyzer.analyze("QUJD", options())).resolves.toEqual({ text: '{"items":[]}', model: PRIMARY });

    const [url, init] = fetchMock.mock.calls.find(([u]) => u.endsWith("/chat/completions"))!;
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer sk-or-test");
    const body = JSON.parse(init!.body as string);
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/jpeg;base64,QUJD");
  });

  it("รวมคำตอบที่มาเป็นหลายส่วน", async () => {
    mockOpenRouter(() => ok([{ type: "text", text: '{"items":' }, { type: "text", text: "[]}" }]));
    await expect(openRouterAnalyzer.analyze("QUJD", options())).resolves.toMatchObject({ text: '{"items":[]}' });
  });

  it("ตัวที่เลือกเต็มโควตา → ลองโมเดลฟรีตัวถัดไปอัตโนมัติ", async () => {
    const { chatModels } = mockOpenRouter((model) =>
      model === PRIMARY ? { status: 429, body: { error: { code: 429, message: "rate-limited upstream" } } } : ok('{"items":[]}'),
    );
    const result = await openRouterAnalyzer.analyze("QUJD", options());
    expect(result.model).toBe("nvidia/nemotron-3.5-super-vl:free");
    expect(chatModels()).toEqual([PRIMARY, "nvidia/nemotron-3.5-super-vl:free"]);
  });

  it("โมเดลที่เพิ่งเต็มโควตาถูกข้ามในรูปถัดไป", async () => {
    const { chatModels } = mockOpenRouter((model) =>
      model === PRIMARY ? { status: 429, body: {} } : ok('{"items":[]}'),
    );
    await openRouterAnalyzer.analyze("QUJD", options());
    await openRouterAnalyzer.analyze("QUJD", options());
    // รูปแรก: PRIMARY → ตัวถัดไป, รูปที่สอง: ข้าม PRIMARY ไปเลย
    expect(chatModels()).toEqual([PRIMARY, FREE_MODELS[1], FREE_MODELS[1]]);
  });

  it("คำตอบว่าง (เช่นโมเดล reasoning ตอบไม่จบ) → ลองตัวถัดไป", async () => {
    mockOpenRouter((model) => (model === PRIMARY ? ok(null) : ok('{"items":[]}')));
    await expect(openRouterAnalyzer.analyze("QUJD", options())).resolves.toMatchObject({ model: FREE_MODELS[1] });
  });

  it("ทุกตัวเต็มโควตา → rate_limited", async () => {
    const { chatModels } = mockOpenRouter(() => ({ status: 429, body: {} }));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("rate_limited");
    expect(chatModels()).toHaveLength(FREE_MODELS.length);
  });

  it("โมเดลเสียเงินไม่สลับไปตัวอื่น", async () => {
    const { chatModels } = mockOpenRouter(() => ({ status: 429, body: {} }));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options("openai/gpt-5")))).toBe("rate_limited");
    expect(chatModels()).toEqual(["openai/gpt-5"]);
  });

  it("key ผิดไม่ลองตัวอื่น", async () => {
    const { chatModels } = mockOpenRouter(() => ({ status: 401, body: {} }));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("auth");
    expect(chatModels()).toEqual([PRIMARY]);
  });

  it("ไม่มี key → auth โดยไม่เรียก API", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const { fetchMock } = mockOpenRouter(() => ok("{}"));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("auth");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ต้นทางล่ม (5xx) → ลองตัวถัดไป", async () => {
    mockOpenRouter((model) => (model === PRIMARY ? { status: 502, body: {} } : ok('{"items":[]}')));
    await expect(openRouterAnalyzer.analyze("QUJD", options())).resolves.toMatchObject({ model: FREE_MODELS[1] });
  });

  it("error อื่นๆ", async () => {
    mockOpenRouter(() => ({ status: 500, body: {} }));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("unreachable");
    mockOpenRouter(() => ({ status: 200, body: { error: { code: 401, message: "bad key" } } }));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("auth");
  });

  it("เน็ตหลุด → unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await codeOf(openRouterAnalyzer.analyze("QUJD", options()))).toBe("unreachable");
  });
});
