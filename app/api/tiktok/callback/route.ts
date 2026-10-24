import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  exchangeTikTokAuthorizationCode,
  persistTikTokAuthorization,
  requireTikTokAdmin,
  tikTokStateCookieOptions,
  tikTokStatesMatch,
} from "@/lib/social/tiktok-oauth";
import { getRequestOrigin } from "@/lib/supabase/request-origin";

export const dynamic = "force-dynamic";

function finish(body: { error: string }, status: number) {
  const response = NextResponse.json(body, { status });
  response.cookies.set(
    TIKTOK_OAUTH_STATE_COOKIE,
    "",
    tikTokStateCookieOptions(0),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const denied = await requireTikTokAdmin();
  if (denied) {
    denied.cookies.set(
      TIKTOK_OAUTH_STATE_COOKIE,
      "",
      tikTokStateCookieOptions(0),
    );
    denied.headers.set("Cache-Control", "no-store");
    return denied;
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;

  if (oauthError) {
    console.error("TikTok authorization declined:", oauthError);
    return finish({ error: "TikTok authorization was declined." }, 400);
  }

  if (
    !code ||
    !returnedState ||
    !expectedState ||
    !tikTokStatesMatch(expectedState, returnedState)
  ) {
    console.error("TikTok callback rejected: state did not match.");
    return finish({ error: "TikTok authorization could not be verified." }, 400);
  }

  const token = await exchangeTikTokAuthorizationCode(code);
  if (!token) {
    return finish({ error: "TikTok token exchange failed." }, 502);
  }

  const saved = await persistTikTokAuthorization(token);
  if (!saved) {
    return finish({ error: "TikTok account could not be saved." }, 502);
  }

  const response = NextResponse.redirect(`${getRequestOrigin(request)}/dashboard`);
  response.cookies.set(
    TIKTOK_OAUTH_STATE_COOKIE,
    "",
    tikTokStateCookieOptions(0),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
