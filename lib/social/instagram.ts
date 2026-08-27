import { getPlatformCredentials } from "@/lib/social/accounts";
import { socialPostId, type SocialPost } from "@/lib/social/types";

const FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "timestamp",
  "username",
  "like_count",
  "comments_count",
  "children{media_url,media_type,thumbnail_url}",
].join(",");

type InstagramMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  children?: {
    data?: Array<{
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
    }>;
  };
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

function firstChild(media: InstagramMedia) {
  const child = media.children?.data?.[0];
  if (!child) return null;
  return child;
}

function toPost(media: InstagramMedia, fallbackAuthor: string): SocialPost | null {
  const id = asString(media.id);
  const postUrl = asString(media.permalink);
  const createdAt = asString(media.timestamp);
  if (!id || !postUrl || !createdAt) return null;

  const child = firstChild(media);
  const rawType = (media.media_type ?? child?.media_type ?? "").toUpperCase();
  const isVideo = rawType === "VIDEO" || rawType === "REELS";
  const mediaUrl = asString(media.media_url) ?? asString(child?.media_url);
  const thumbnailUrl =
    asString(media.thumbnail_url) ?? asString(child?.thumbnail_url);

  return {
    id: socialPostId("instagram", id),
    platform: "instagram",
    author: asString(media.username) ?? fallbackAuthor,
    text: asString(media.caption),
    mediaUrl: isVideo ? undefined : mediaUrl,
    thumbnailUrl: isVideo ? thumbnailUrl ?? mediaUrl : thumbnailUrl,
    mediaType: mediaUrl || thumbnailUrl ? (isVideo ? "video" : "image") : undefined,
    postUrl,
    createdAt,
    likes: asNumber(media.like_count),
    comments: asNumber(media.comments_count),
  };
}

export async function fetchInstagramPosts(limit = 8): Promise<SocialPost[]> {
  const credentials = await getPlatformCredentials("instagram");
  if (!credentials) return [];

  const userId = encodeURIComponent(credentials.accountId);
  const base =
    process.env.INSTAGRAM_GRAPH_BASE?.replace(/\/$/, "") ||
    "https://graph.instagram.com/v22.0";
  const url = new URL(`${base}/${userId}/media`);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", credentials.accessToken);

  const response = await fetch(url, { cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (isRecord(body) && isRecord(body.error)
        ? asString(body.error.message)
        : undefined) ?? `Instagram API ${response.status}`;
    throw new Error(message);
  }

  const items =
    isRecord(body) && Array.isArray(body.data) ? (body.data as InstagramMedia[]) : [];

  return items.flatMap((item) => {
    const post = toPost(item, credentials.accountName);
    return post ? [post] : [];
  });
}
