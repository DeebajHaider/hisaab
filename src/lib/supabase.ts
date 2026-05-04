import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

// Read environment variables. Vite injects VITE_-prefixed vars at build time.
// They are PUBLIC — visible in the browser bundle. RLS is what protects data,
// not the secrecy of these values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast at startup instead of mysterious errors later.
  throw new Error(
    "Missing Supabase environment variables. " +
      "Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// Singleton client. Importing this elsewhere always returns the same instance,
// which is important for auth state — the client manages session tokens internally.
// The <Database> generic ties supabase.from('table') to the generated types.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);