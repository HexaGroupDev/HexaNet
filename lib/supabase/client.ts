import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // Server `/auth/callback` exchanges the PKCE code. If the browser
        // also detects `?code=` in the URL, the second exchange fails with
        // flow_state_already_used and dumps the user on the Site URL.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    },
  );
}
