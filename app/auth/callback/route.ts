import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent("No authorization code returned.")}`,
    );
  }

  let response = NextResponse.redirect(`${origin}${next}`);

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  // New Google/email users without a birthday complete onboarding first.
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
      const detailsUrl = `${origin}${DETAILS_PATH}`;
      const detailsResponse = NextResponse.redirect(detailsUrl);
      response.cookies.getAll().forEach((cookie) => {
        detailsResponse.cookies.set(cookie);
      });
      return detailsResponse;
    }
  }

  return response;
}
