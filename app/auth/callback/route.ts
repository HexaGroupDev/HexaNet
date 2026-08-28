import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestOrigin } from "@/lib/supabase/request-origin";
import { redirectWithFlash } from "@/lib/alerts/flash";

const DEFAULT_REDIRECT = "/dashboard";
const DETAILS_PATH = "/auth/details";

function resolveRedirectPath(nextParam: string | null): string {
  if (
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//")
  ) {
    return nextParam;
  }
  return DEFAULT_REDIRECT;
}

function isFlowStateConsumed(error: { code?: string; message: string }) {
  return (
    error.code === "flow_state_already_used" ||
    /already been used/i.test(error.message)
  );
}

function redirectWithCookies(
  url: string,
  source: NextResponse,
) {
  const response = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = resolveRedirectPath(searchParams.get("next"));
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  let response = NextResponse.redirect(`${origin}${next}`);
  response.headers.set("Cache-Control", "no-store");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.redirect(`${origin}${next}`);
          response.headers.set("Cache-Control", "no-store");
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  async function finish() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && next !== DETAILS_PATH) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("birthday")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.birthday) {
        return redirectWithCookies(`${origin}${DETAILS_PATH}`, response);
      }
    }

    if (user) {
      return redirectWithCookies(`${origin}${next}`, response);
    }

    return null;
  }

  if (!code) {
    const existing = await finish();
    if (existing) return existing;

    return redirectWithFlash(
      `${origin}/auth/login`,
      oauthError || "No authorization code returned.",
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (isFlowStateConsumed(error)) {
      const existing = await finish();
      if (existing) return existing;
    }

    return redirectWithFlash(`${origin}/auth/login`, error.message);
  }

  const completed = await finish();
  return completed ?? response;
}
