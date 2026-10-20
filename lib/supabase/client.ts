import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicConfig } from "./env";

export function createSupabaseBrowserClient() {
  const config = supabasePublicConfig();
  if (!config) {
    throw new Error("Supabase URL and publishable key are required.");
  }

  return createBrowserClient(config.url, config.publishableKey);
}
