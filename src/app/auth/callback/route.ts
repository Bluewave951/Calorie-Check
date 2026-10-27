import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { handleAuthCallback } from "./handler";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });

  return handleAuthCallback(request, async (code) => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error === null;
  });
}
