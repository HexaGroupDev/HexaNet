import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/supabase/request-origin";
import { redirectWithFlash } from "@/lib/alerts/flash";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // PKCE email links land with ?code= — exchange via the callback route
  if (code) {
    const params = new URLSearchParams({ code, next });
    redirect(`/auth/callback?${params.toString()}`);
  }

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      redirect(next);
    }

    return redirectWithFlash(
      `${origin}/auth/login`,
      error.message || "Could not verify your email link.",
    );
  }

  return redirectWithFlash(
    `${origin}/auth/login`,
    "This confirmation link is invalid or has expired.",
  );
}
