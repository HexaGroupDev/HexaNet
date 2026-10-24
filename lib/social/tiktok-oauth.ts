import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { canAdmin, parseAppPermission } from "@/lib/profiles/permissions";
import { createClient } from "@/lib/supabase/server";

export const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";
export const TIKTOK_REDIRECT_URI =
  "https://yoda.hexagroup.com/api/tiktok/callback";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";
const SCOPES = "user.info.basic,video.list";
const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "cover_image_url",
  "share_url",
  "embed_link",
  "create_time",
] as const;

export type TikTokVideoFields = {
  id: string | null;
  title: string | null;
  video_description: string | null;
  cover_image_url: string | null;
  share_url: string | null;
  embed_link: string | null;
  create_time: number | null;
};

type TokenErrorBody = {
  error?: string;
  error_description?: string;
  log_id?: string;
  access_token?: string;
};

type VideoListBody = {
  data?: { videos?: unknown[] };
  error?: { code?: string; message?: string; log_id?: string };
};

export function tikTokStateCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/tiktok",
    maxAge,
  };
}

export function tikTokStatesMatch(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function requireTikTokAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("permissions")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("TikTok admin check failed:", profileError.message);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAdmin(parseAppPermission(profile?.permissions))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function tikTokClientCredentials() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) return null;
  return { clientKey, clientSecret };
}

export function tikTokAuthorizeUrl(clientKey: string, state: string) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", TIKTOK_REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("disable_auto_auth", "1");
  return url;
}

export async function exchangeTikTokAuthorizationCode(code: string) {
  const credentials = tikTokClientCredentials();
  if (!credentials) {
    console.error(
      "TikTok token exchange skipped: TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET is not configured.",
    );
    return null;
  }

  const body = new URLSearchParams({
    client_key: credentials.clientKey,
    client_secret: credentials.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: TIKTOK_REDIRECT_URI,
  });

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "TikTok token exchange failed:",
      error instanceof Error ? error.message : "request failed",
    );
    return null;
  }

  let payload: TokenErrorBody;
  try {
    payload = (await response.json()) as TokenErrorBody;
  } catch {
    console.error("TikTok token exchange failed: HTTP", response.status);
    return null;
  }

  const accessToken = payload.access_token?.trim();
  if (!response.ok || !accessToken) {
    console.error(
      "TikTok token exchange failed:",
      payload.error ?? `HTTP ${response.status}`,
      payload.error_description ?? "",
      payload.log_id ?? "",
    );
    return null;
  }

  return accessToken;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickVideo(value: unknown): TikTokVideoFields {
  const row = asRecord(value);
  const video = {} as TikTokVideoFields;

  for (const field of VIDEO_FIELDS) {
    const raw = row?.[field];
    if (field === "create_time") {
      video.create_time = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      continue;
    }
    video[field] = typeof raw === "string" && raw.trim() ? raw : null;
  }

  return video;
}

export async function fetchLatestTikTokVideo(accessToken: string) {
  const url = new URL(VIDEO_LIST_URL);
  url.searchParams.set("fields", VIDEO_FIELDS.join(","));

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 1 }),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "TikTok video list failed:",
      error instanceof Error ? error.message : "request failed",
    );
    return null;
  }

  let payload: VideoListBody;
  try {
    payload = (await response.json()) as VideoListBody;
  } catch {
    console.error("TikTok video list failed: HTTP", response.status);
    return null;
  }

  const errorCode = payload.error?.code;
  if (!response.ok || (errorCode && errorCode !== "ok")) {
    console.error(
      "TikTok video list failed:",
      errorCode ?? `HTTP ${response.status}`,
      payload.error?.message ?? "",
      payload.error?.log_id ?? "",
    );
    return null;
  }

  const videos = Array.isArray(payload.data?.videos) ? payload.data.videos : [];
  return videos.slice(0, 1).map(pickVideo);
}
