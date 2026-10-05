import { toPost, type FacebookPost } from "@/lib/social/facebook";

const GRAPH_VERSION = "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DEFAULT_AUTHOR = "HexaGroup";

type GraphAttachmentMedia = {
  image?: { src?: string };
  source?: string;
};

type GraphAttachment = {
  media_type?: string;
  type?: string;
  media?: GraphAttachmentMedia;
  target?: { id?: string };
};

type GraphPostItem = {
  id?: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: { data?: GraphAttachment[] };
};

type GraphErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
  data?: GraphPostItem[];
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pageCredentials() {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim();
  if (!accessToken || !pageId) return null;
  return { accessToken, pageId };
}

function firstAttachment(item: GraphPostItem) {
  const data = item.attachments?.data;
  return Array.isArray(data) ? data[0] : undefined;
}

function isVideoAttachment(attachment: GraphAttachment | undefined) {
  if (!attachment) return false;
  const mediaType = asString(attachment.media_type)?.toLowerCase();
  const type = asString(attachment.type)?.toLowerCase();
  return (
    mediaType === "video" ||
    Boolean(type?.includes("video")) ||
    Boolean(asString(attachment.media?.source))
  );
}

function postFromGraphItem(item: GraphPostItem): FacebookPost | null {
  const postId = asString(item.id);
  if (!postId) return null;

  const attachment = firstAttachment(item);
  const videoUrl = asString(attachment?.media?.source);
  const thumbnailUrl =
    asString(attachment?.media?.image?.src) ?? asString(item.full_picture);

  let publishedAt: string | undefined;
  if (item.created_time) {
    const parsedDate = Date.parse(item.created_time);
    if (Number.isFinite(parsedDate)) {
      publishedAt = new Date(parsedDate).toISOString();
    }
  }

  return toPost(postId, {
    caption: asString(item.message),
    thumbnailUrl,
    videoUrl: isVideoAttachment(attachment) ? videoUrl : null,
    postUrl: asString(item.permalink_url),
    authorName: DEFAULT_AUTHOR,
    handle: DEFAULT_AUTHOR,
    publishedAt,
  });
}

async function fetchVideoSource(
  videoId: string,
  accessToken: string,
): Promise<{ source: string | null; picture: string | null } | null> {
  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(videoId)}`);
  url.searchParams.set("fields", "source,picture");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  let payload: {
    error?: { message?: string };
    source?: string;
    picture?: string;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    console.error("Facebook Graph API video fetch failed:", response.status);
    return null;
  }

  if (!response.ok || payload.error) {
    console.error(
      "Facebook Graph API video fetch failed:",
      payload.error?.message ?? `HTTP ${response.status}`,
    );
    return null;
  }

  return {
    source: asString(payload.source),
    picture: asString(payload.picture),
  };
}

export async function fetchLatestFacebookPostFromGraph(): Promise<FacebookPost | null> {
  const credentials = pageCredentials();
  if (!credentials) {
    console.error(
      "Facebook Graph API skipped: FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not configured.",
    );
    return null;
  }

  const url = new URL(`${GRAPH_BASE}/${encodeURIComponent(credentials.pageId)}/posts`);
  url.searchParams.set(
    "fields",
    "id,message,created_time,permalink_url,full_picture,attachments{media_type,type,media,target}",
  );
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", credentials.accessToken);

  const response = await fetch(url, { cache: "no-store" });
  let payload: GraphErrorPayload;
  try {
    payload = (await response.json()) as GraphErrorPayload;
  } catch {
    console.error("Facebook Graph API posts fetch failed:", response.status);
    return null;
  }

  if (!response.ok || payload.error) {
    console.error(
      "Facebook Graph API posts fetch failed:",
      payload.error?.message ?? `HTTP ${response.status}`,
    );
    return null;
  }

  const item = Array.isArray(payload.data) ? payload.data[0] : undefined;
  if (!item) {
    console.warn("Facebook Graph API returned no posts.");
    return null;
  }

  const post = postFromGraphItem(item);
  if (!post) return null;

  if (!post.videoUrl) {
    const videoId = asString(firstAttachment(item)?.target?.id);
    if (videoId) {
      const extra = await fetchVideoSource(videoId, credentials.accessToken);
      if (extra?.source || extra?.picture) {
        return {
          ...post,
          videoUrl: extra.source ?? post.videoUrl,
          thumbnailUrl: post.thumbnailUrl ?? extra.picture,
        };
      }
    }
  }

  return post;
}
