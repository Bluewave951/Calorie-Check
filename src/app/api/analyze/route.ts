import { NextResponse } from "next/server";
import { z } from "zod";
import { AnalyzerError } from "@/lib/aiCore";
import { getAnalyzer, PROVIDER, resolveModel } from "@/lib/analyzer";
import { AiOutputError, parseAiOutput } from "@/lib/schema";
import { itemFromAi } from "@/lib/nutrition";
import type { AnalyzeError, AnalyzeErrorCode, AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";

const TIMEOUT_MS = 120_000;

const requestSchema = z.object({
  /** JPEG แบบ base64 (ไม่มี data: prefix) */
  image: z.string().min(100).max(8_000_000),
  model: z
    .string()
    .regex(/^[\w.:/-]*$/)
    .max(120)
    .optional(),
});

const STATUS: Partial<Record<AnalyzeErrorCode, number>> = {
  model_missing: 424,
  auth: 401,
  rate_limited: 429,
};

function fail(code: AnalyzeErrorCode, message: string, status: number) {
  return NextResponse.json<AnalyzeError>({ error: code, message, provider: PROVIDER }, { status });
}

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("bad_request", "ข้อมูลรูปไม่ถูกต้อง", 400);

  const model = resolveModel(body.data.model);
  const started = Date.now();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]);

  try {
    const result = await getAnalyzer().analyze(body.data.image, { model, signal });
    const { items } = parseAiOutput(result.text);
    return NextResponse.json<AnalyzeResponse>({
      items: items.map(itemFromAi),
      model: result.model,
      ms: Date.now() - started,
    });
  } catch (error) {
    if (error instanceof AnalyzerError) return fail(error.code, error.message, STATUS[error.code] ?? 503);
    if (error instanceof AiOutputError) {
      return fail("bad_output", `AI ตอบกลับในรูปแบบที่อ่านไม่ได้ (${error.message}) ลองถ่ายใหม่อีกครั้ง`, 502);
    }
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return fail("timeout", "AI ใช้เวลานานเกินไป ลองใหม่อีกครั้ง หรือเลือกโมเดลอื่นในหน้าตั้งค่า", 504);
    }
    throw error;
  }
}
