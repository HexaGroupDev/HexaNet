import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle(next = "/dashboard") {
  const supabase = createClient();
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      // Force the Google account picker so a personal Gmail session
      // already in the browser is not used automatically.
      queryParams: {
        prompt: "select_account",
      },
    },
  });
}
