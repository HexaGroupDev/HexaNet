import { createClient } from "@/lib/supabase/client";

let googleSignInStarted = false;

export async function signInWithGoogle(next = "/dashboard") {
  if (googleSignInStarted) {
    return { data: { provider: "google" as const, url: null }, error: null };
  }
  googleSignInStarted = true;

  const supabase = createClient();
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      skipBrowserRedirect: true,
      // Force the Google account picker so a personal Gmail session
      // already in the browser is not used automatically.
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    googleSignInStarted = false;
    return { data, error };
  }

  window.location.assign(data.url);
  return { data, error };
}
