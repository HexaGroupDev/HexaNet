import {
  parseInstagramPostUrl,
  parseInstagramProfileUrl,
  toPost,
  type InstagramPost,
} from "@/lib/social/instagram";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const APP_ID = "936619743392459";
const POST_DOC_ID = "27128499623469141";

type InstagramSession = {
  cookies: string;
  csrf: string | null;
  lsd: string | null;
  asbd: string;
  ajax: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function httpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
}

function unixToIso(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 1_000_000_000) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  return null;
}


async function createInstagramSession(referer: string): Promise<InstagramSession> {
  const response = await fetch(referer, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  const html = await response.text();
  const cookies = (response.headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  return {
    cookies,
    csrf: html.match(/"csrf_token":"([^"]+)"/)?.[1] ?? null,
    lsd: html.match(/"LSD",\[\],\{"token":"([^"]+)"/)?.[1] ?? null,
    asbd: html.match(/"ASBD_ID":"(\d+)"/)?.[1] ?? "359341",
    ajax: html.match(/"rollout_hash":"([^"]+)"/)?.[1] ?? "1028856845",
  };
}

function sessionHeaders(session: InstagramSession, referer: string) {
  return {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
    Origin: "https://www.instagram.com",
    "User-Agent": USER_AGENT,
    "X-IG-App-ID": APP_ID,
    "X-ASBD-ID": session.asbd,
    "X-Instagram-AJAX": session.ajax,
    "X-CSRFToken": session.csrf ?? "",
    "X-FB-LSD": session.lsd ?? "",
    Cookie: session.cookies,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };
}

function postPathFromNode(
  node: Record<string, unknown>,
  videoUrl: string | null,
): "p" | "reel" | "tv" {
  const typename = asString(node.__typename);
  if (typename === "GraphVideo" || asString(node.product_type) === "clips") {
    return "reel";
  }
  if (typename === "GraphSidecar") return "p";
  if (node.is_video === true || videoUrl) return "reel";
  return "p";
}

function postFromTimelineNode(
  node: Record<string, unknown>,
  handle: string,
): InstagramPost | null {
  const shortcode = asString(node.shortcode);
  if (!shortcode) return null;

  const owner = asRecord(node.owner);
  const captionEdges = asRecord(node.edge_media_to_caption)?.edges;
  const captionNode = Array.isArray(captionEdges)
    ? asRecord(asRecord(captionEdges[0])?.node)
    : null;

  const videoUrl = httpUrl(node.video_url);
  const thumbnailUrl = httpUrl(node.display_url) ?? httpUrl(node.thumbnail_src);
  if (!thumbnailUrl && !videoUrl) return null;

  return toPost(handle, shortcode, {
    caption: asString(captionNode?.text),
    thumbnailUrl,
    videoUrl,
    postPath: postPathFromNode(node, videoUrl),
    authorName:
      asString(owner?.username) ??
      asString(asRecord(node.user)?.username) ??
      handle,
    publishedAt:
      unixToIso(node.taken_at_timestamp) ??
      unixToIso(node.taken_at) ??
      undefined,
  });
}

function postFromGraphItem(
  item: Record<string, unknown>,
  handle: string,
): InstagramPost | null {
  const shortcode = asString(item.code) ?? asString(item.shortcode);
  if (!shortcode) return null;

  const versions = item.video_versions;
  const videoUrl = Array.isArray(versions)
    ? httpUrl(asRecord(versions[0])?.url)
    : httpUrl(item.video_url);

  const imageVersions = asRecord(item.image_versions2)?.candidates;
  const thumbnailUrl = Array.isArray(imageVersions)
    ? httpUrl(asRecord(imageVersions[0])?.url)
    : httpUrl(item.display_url) ?? httpUrl(item.thumbnail_url);

  const caption = asRecord(item.caption);
  const user = asRecord(item.user);
  const mediaType = item.media_type;

  return toPost(handle, shortcode, {
    caption: asString(caption?.text),
    thumbnailUrl,
    videoUrl,
    postPath: mediaType === 2 ? "reel" : "p",
    authorName: asString(user?.username) ?? handle,
    publishedAt: unixToIso(item.taken_at) ?? undefined,
  });
}

async function fetchWebProfileInfo(
  handle: string,
  session: InstagramSession,
): Promise<InstagramPost | null> {
  const referer = `https://www.instagram.com/${handle}/`;
  const response = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    {
      headers: sessionHeaders(session, referer),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    data?: { user?: Record<string, unknown> };
  };
  const user = asRecord(payload.data?.user);
  if (!user) return null;

  const timeline = asRecord(user.edge_owner_to_timeline_media);
  const edges = timeline?.edges;
  if (!Array.isArray(edges)) return null;

  const authorName = asString(user.username) ?? handle;

  for (const edge of edges) {
    const node = asRecord(asRecord(edge)?.node);
    if (!node) continue;

    const post = postFromTimelineNode(node, authorName);
    if (post) return post;
  }

  return null;
}

async function fetchPostByShortcode(
  shortcode: string,
  handle: string,
  session: InstagramSession,
): Promise<InstagramPost | null> {
  const referer = `https://www.instagram.com/reel/${shortcode}/`;
  const body = new URLSearchParams({
    variables: JSON.stringify({
      shortcode,
      __relay_internal__pv__PolarisAIGMMediaWebLabelEnabledrelayprovider: false,
    }),
    doc_id: POST_DOC_ID,
    lsd: session.lsd ?? "",
  });

  const response = await fetch("https://www.instagram.com/graphql/query/", {
    method: "POST",
    headers: {
      ...sessionHeaders(session, referer),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    data?: {
      xdt_api__v1__media__shortcode__web_info?: {
        items?: unknown[];
      };
    };
  };
  const items =
    payload.data?.xdt_api__v1__media__shortcode__web_info?.items ?? [];
  const item = asRecord(items[0]);
  if (!item) return null;

  return postFromGraphItem(item, handle);
}

async function fetchLatestFromGraphApi(
  accessToken: string,
): Promise<InstagramPost | null> {
  const meUrl = new URL("https://graph.instagram.com/v21.0/me");
  meUrl.searchParams.set("fields", "id,username");
  meUrl.searchParams.set("access_token", accessToken);

  const meResponse = await fetch(meUrl, { cache: "no-store" });
  const mePayload = meResponse.ok
    ? ((await meResponse.json()) as { username?: string })
    : null;
  const handle = asString(mePayload?.username) ?? "instagram";

  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  const mediaPath = userId
    ? `https://graph.instagram.com/v21.0/${encodeURIComponent(userId)}/media`
    : "https://graph.instagram.com/v21.0/me/media";

  const url = new URL(mediaPath);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
  );
  url.searchParams.set("limit", "25");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const payload = (await response.json()) as { data?: unknown[] };
  const items = Array.isArray(payload.data) ? payload.data : [];

  for (const entry of items) {
    const item = asRecord(entry);
    if (!item) continue;

    const permalink = asString(item.permalink);
    const parsed = permalink ? parseInstagramPostUrl(permalink) : null;
    const postId = parsed?.shortcode ?? asString(item.id);
    if (!postId) continue;

    const mediaType = asString(item.media_type)?.toUpperCase();
    const postPath =
      mediaType === "VIDEO" || mediaType === "REELS"
        ? "reel"
        : permalink?.includes("/reel/")
          ? "reel"
          : "p";

    return toPost(handle, postId, {
      caption: asString(item.caption),
      thumbnailUrl: asString(item.thumbnail_url),
      videoUrl: asString(item.media_url),
      postPath,
      authorName: handle,
      publishedAt: unixToIso(item.timestamp) ?? undefined,
    });
  }

  return null;
}

function hasPost(post: InstagramPost | null) {
  return Boolean(post?.postUrl && post.postId);
}

export async function scrapeLatestInstagramPost(
  profileUrl: string,
  options?: { accessToken?: string | null },
): Promise<InstagramPost | null> {
  const direct = parseInstagramPostUrl(profileUrl);
  const handle = parseInstagramProfileUrl(profileUrl);
  const session = await createInstagramSession(
    handle
      ? `https://www.instagram.com/${handle}/`
      : direct
        ? `https://www.instagram.com/reel/${direct.shortcode}/`
        : "https://www.instagram.com/",
  );

  if (direct?.shortcode) {
    const post = await fetchPostByShortcode(
      direct.shortcode,
      handle ?? "instagram",
      session,
    );
    if (hasPost(post)) return post;
  }

  if (handle) {
    const fromProfile = await fetchWebProfileInfo(handle, session);
    if (hasPost(fromProfile)) return fromProfile;
  }

  const accessToken = options?.accessToken?.trim();
  if (accessToken) {
    const fromGraph = await fetchLatestFromGraphApi(accessToken);
    if (hasPost(fromGraph)) return fromGraph;
  }

  return null;
}

/** @deprecated Use scrapeLatestInstagramPost */
export const scrapeLatestInstagramVideo = scrapeLatestInstagramPost;
