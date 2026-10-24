import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  TIKTOK_OAUTH_STATE_COOKIE,
  requireTikTokAdmin,
  tikTokAuthorizeUrl,
  tikTokClientCredentials,
  tikTokStateCookieOptions,
} from "@/lib/social/tiktok-oauth";

export const dynamic = "force-dynamic";

const STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET() {
  const denied = await requireTikTokAdmin();
  if (denied) return denied;

  const credentials = tikTokClientCredentials();
  if (!credentials) {
    console.error(
      "TikTok auth skipped: TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET is not configured.",
    );
    return NextResponse.json(
      { error: "TikTok is not configured." },
      { status: 500 },
    );
  }

  const state = randomBytes(32).toString("hex");
  const response = NextResponse.redirect(
    tikTokAuthorizeUrl(credentials.clientKey, state),
  );
  response.cookies.set(
    TIKTOK_OAUTH_STATE_COOKIE,
    state,
    tikTokStateCookieOptions(STATE_MAX_AGE_SECONDS),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
