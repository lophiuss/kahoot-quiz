import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service role key. Bypasses RLS.
 * Only ever import this from route handlers (app/api/**), never from
 * anything that ships to the browser.
 */
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
