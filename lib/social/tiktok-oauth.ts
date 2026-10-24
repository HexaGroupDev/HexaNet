import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { canAdmin, parseAppPermission } from "@/lib/profiles/permissions";
import { toPost, type TikTokPost } from "@/lib/social/tiktok";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const TIKTOK_OAUTH_STATE_COOKIE = "tiktok_oauth_state";
export const TIKTOK_REDIRECT_URI =
  "https://yoda.hexagroup.com/api/tiktok/callback";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";
const DEFAULT_HANDLE = "hexagroupmarketing";
/** Refresh before the 24-hour access token expires. */
const REFRESH_WITHIN_MS = 2 * 60 * 60 * 1000;
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

export type TikTokTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  openId: string;
};

export type TikTokAccount = {
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string | null;
};

type TokenErrorBody = {
  error?: string;
  error_description?: string;
  log_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
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

function tryAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error(
      "TikTok account store unavailable:",
      error instanceof Error ? error.message : "admin client unavailable",
    );
    return null;
  }
}

function expiresAtFromSeconds(expiresIn: number) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function handleFromShareUrl(shareUrl: string | null) {
  if (!shareUrl) return DEFAULT_HANDLE;
  try {
    const match = new URL(shareUrl).pathname.match(/^\/@([\w.]+)\/video\/\d+/);
    return match?.[1] ?? DEFAULT_HANDLE;
  } catch {
    return DEFAULT_HANDLE;
  }
}

function publishedAtFromCreateTime(createTime: number | null) {
  if (createTime == null || !Number.isFinite(createTime)) return undefined;
  const ms = createTime > 1e12 ? createTime : createTime * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function fetchDisplayName(accessToken: string) {
  const url = new URL(USER_INFO_URL);
  url.searchParams.set("fields", "display_name");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  let payload: {
    data?: { user?: { display_name?: string } };
    error?: { code?: string };
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return null;
  }

  const name = payload.data?.user?.display_name?.trim();
  if (!response.ok || (payload.error?.code && payload.error.code !== "ok") || !name) {
    return null;
  }
  return name;
}

export async function loadTikTokAccount(): Promise<TikTokAccount | null> {
  const admin = tryAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("social_accounts")
    .select("account_id, account_name, access_token, refresh_token, token_expires_at")
    .eq("platform", "tiktok")
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load TikTok account:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const accessToken = typeof row.access_token === "string" ? row.access_token.trim() : "";
  const refreshToken = typeof row.refresh_token === "string" ? row.refresh_token.trim() : "";
  const accountId = typeof row.account_id === "string" ? row.account_id.trim() : "";
  if (!accessToken || !refreshToken || !accountId) return null;

  return {
    accountId,
    accountName:
      typeof row.account_name === "string" && row.account_name.trim()
        ? row.account_name.trim()
        : DEFAULT_HANDLE,
    accessToken,
    refreshToken,
    tokenExpiresAt: typeof row.token_expires_at === "string" ? row.token_expires_at : null,
  };
}

async function saveTikTokToken(accountId: string, accountName: string, token: TikTokTokenSet) {
  const admin = tryAdminClient();
  if (!admin) return false;

  const { error: disableError } = await admin
    .from("social_accounts")
    .update({ enabled: false })
    .eq("platform", "tiktok")
    .neq("account_id", accountId);

  if (disableError) {
    console.error("Failed to disable previous TikTok accounts:", disableError.message);
  }

  const { error } = await admin.from("social_accounts").upsert(
    {
      platform: "tiktok",
      account_id: accountId,
      account_name: accountName,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      token_expires_at: expiresAtFromSeconds(token.expiresIn),
      enabled: true,
    },
    { onConflict: "platform,account_id" },
  );

  if (error) {
    console.error("Failed to persist TikTok token:", error.message);
    return false;
  }
  return true;
}

export async function persistTikTokAuthorization(token: TikTokTokenSet) {
  const displayName = await fetchDisplayName(token.accessToken);
  return saveTikTokToken(token.openId, displayName ?? DEFAULT_HANDLE, token);
}

export async function ensureFreshTikTokToken(account: TikTokAccount) {
  const expiresAtMs = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : Number.NaN;
  const needsRefresh =
    !Number.isFinite(expiresAtMs) || expiresAtMs - Date.now() < REFRESH_WITHIN_MS;
  if (!needsRefresh) return account.accessToken;

  const credentials = tikTokClientCredentials();
  if (!credentials) {
    console.error("TikTok token refresh skipped: client credentials are not configured.");
    return account.accessToken;
  }

  const body = new URLSearchParams({
    client_key: credentials.clientKey,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
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
      "TikTok token refresh failed:",
      error instanceof Error ? error.message : "request failed",
    );
    return account.accessToken;
  }

  let payload: TokenErrorBody;
  try {
    payload = (await response.json()) as TokenErrorBody;
  } catch {
    console.error("TikTok token refresh failed: HTTP", response.status);
    return account.accessToken;
  }

  const accessToken = payload.access_token?.trim();
  const refreshToken = payload.refresh_token?.trim();
  if (!response.ok || !accessToken || !refreshToken || !payload.expires_in) {
    console.error(
      "TikTok token refresh failed:",
      payload.error ?? `HTTP ${response.status}`,
      payload.error_description ?? "",
      payload.log_id ?? "",
    );
    return account.accessToken;
  }

  const next: TikTokTokenSet = {
    accessToken,
    refreshToken,
    expiresIn: payload.expires_in,
    openId: account.accountId,
  };
  await saveTikTokToken(account.accountId, account.accountName, next);
  return accessToken;
}

export function tikTokPostFromListedVideo(
  video: TikTokVideoFields,
  authorName: string,
): TikTokPost | null {
  const videoId = video.id?.trim();
  if (!videoId || !/^\d{10,}$/.test(videoId)) return null;

  const handle = handleFromShareUrl(video.share_url);
  return toPost(handle, videoId, {
    caption: video.video_description ?? video.title,
    thumbnailUrl: video.cover_image_url,
    authorName,
    publishedAt: publishedAtFromCreateTime(video.create_time),
  });
}

export async function fetchLatestTikTokPost(): Promise<TikTokPost | null> {
  const account = await loadTikTokAccount();
  if (!account) {
    console.warn("TikTok sync skipped: no enabled social_accounts row.");
    return null;
  }

  const accessToken = await ensureFreshTikTokToken(account);
  const videos = await fetchLatestTikTokVideo(accessToken);
  const video = videos?.[0];
  if (!video) return null;
  return tikTokPostFromListedVideo(video, account.accountName);
}

export async function exchangeTikTokAuthorizationCode(code: string): Promise<TikTokTokenSet | null> {
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
  const refreshToken = payload.refresh_token?.trim();
  const openId = payload.open_id?.trim();
  if (!response.ok || !accessToken || !refreshToken || !openId || !payload.expires_in) {
    console.error(
      "TikTok token exchange failed:",
      payload.error ?? `HTTP ${response.status}`,
      payload.error_description ?? "",
      payload.log_id ?? "",
    );
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: payload.expires_in,
    openId,
  };
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
