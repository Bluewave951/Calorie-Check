import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export { CLOUD_ENABLED } from "./config";

let client: SupabaseClient | null = null;

/** client ฝั่งเบราว์เซอร์ (session เก็บใน cookie ให้ proxy อ่านได้) */
export function getSupabase(): SupabaseClient {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
