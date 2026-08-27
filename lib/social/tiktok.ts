import {
  getPlatformCredentials,
  tokenNeedsRefresh,
  updateAccountTokens,
} from "@/lib/social/accounts";
import { postId } from "@/lib/social/posts";
import type { SocialPost } from "@/lib/social/types";

const VIDEO_FIELDS = [
  "id",
  "create_time",
  "cover_image_url",
  "share_url",
  "video_description",
  "title",
  "like_count",
  "comment_count",
].join(",");

type TikTokVideo = {
  id?: string;
  create_time?: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  title?: string;
  like_count?: number;
  comment_count?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function refreshDatabaseToken(
  credentials: Awaited<ReturnType<typeof getPlatformCredentials>>,
) {
  if (
    !credentials ||
    credentials.source !== "database" ||
    !credentials.refreshToken ||
    !tokenNeedsRefresh(credentials.tokenExpiresAt, 60 * 60 * 1000)
  ) {
    return credentials;
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) return credentials;

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
  });

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(json)) return credentials;

  const accessToken = asString(json.access_token);
  if (!accessToken) return credentials;

  const next = {
    accessToken,
    refreshToken: asString(json.refresh_token),
    expiresInSeconds: asNumber(json.expires_in),
  };
  await updateAccountTokens(credentials, next);
  return { ...credentials, accessToken: next.accessToken, refreshToken: next.refreshToken };
}

function toPost(video: TikTokVideo, author: string): SocialPost | null {
  const id = asString(video.id);
  const postUrl = asString(video.share_url);
  const created = asNumber(video.create_time);
  if (!id || !postUrl || created == null) return null;

  const text = asString(video.video_description) ?? asString(video.title);
  const cover = asString(video.cover_image_url);

  return {
    id: postId("tiktok", id),
    platform: "tiktok",
    author,
    text,
    thumbnailUrl: cover,
    mediaType: cover ? "video" : undefined,
    postUrl,
    createdAt: new Date(created * 1000).toISOString(),
    likes: asNumber(video.like_count),
    comments: asNumber(video.comment_count),
  };
}

export async function fetchTikTokPosts(limit = 8): Promise<SocialPost[]> {
  const credentials = await refreshDatabaseToken(await getPlatformCredentials("tiktok"));
  if (!credentials) return [];

  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set("fields", VIDEO_FIELDS);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: Math.min(Math.max(limit, 1), 20) }),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);

  const errorCode =
    isRecord(body) && isRecord(body.error) ? asString(body.error.code) : undefined;
  if (!response.ok || (errorCode && errorCode !== "ok")) {
    const message =
      (isRecord(body) && isRecord(body.error)
        ? asString(body.error.message)
        : undefined) ?? `TikTok API ${response.status}`;
    throw new Error(message);
  }

  const videos =
    isRecord(body) && isRecord(body.data) && Array.isArray(body.data.videos)
      ? (body.data.videos as TikTokVideo[])
      : [];

  return videos.flatMap((video) => {
    const post = toPost(video, credentials.accountName);
    return post ? [post] : [];
  });
}
