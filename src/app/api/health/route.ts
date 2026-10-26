import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/analyzer";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await checkHealth());
}
