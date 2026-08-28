import {
  parseTikTokProfileUrl,
  parseTikTokVideoUrl,
  publishedAtFromVideoId,
  toPost,
  type TikTokPost,
} from "@/lib/social/tiktok";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.tiktok.com/",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.text();
}

function scriptJson(html: string, scriptId: string) {
  const match = html.match(
    new RegExp(
      `<script[^>]*id="${scriptId}"[^>]*>([\\s\\S]*?)</script>`,
      "i",
    ),
  );
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
}

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

function videoIdFromUnknown(value: unknown) {
  if (typeof value === "string" && /^\d{10,}$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const id = String(Math.trunc(value));
    return /^\d{10,}$/.test(id) ? id : null;
  }
  return null;
}

function unixToIso(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 1_000_000_000) {
      const ms = numeric > 1e12 ? numeric : numeric * 1000;
      return new Date(ms).toISOString();
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 1_000_000_000) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return null;
}

function postFromItem(
  item: Record<string, unknown>,
  handle: string,
  authorName?: string | null,
): TikTokPost | null {
  const video = asRecord(item.video);
  const author = asRecord(item.author);
  const id = videoIdFromUnknown(item.id ?? item.itemId ?? video?.id);
  if (!id) return null;

  const itemHandle =
    asString(item.authorUniqueId) ??
    asString(author?.uniqueId) ??
    handle;

  return toPost(itemHandle, id, {
    caption: asString(item.desc) ?? asString(item.description) ?? asString(video?.desc),
    thumbnailUrl:
      httpUrl(item.coverUrl) ??
      httpUrl(item.originCoverUrl) ??
      httpUrl(item.dynamicCoverUrl) ??
      httpUrl(video?.cover) ??
      httpUrl(video?.originCover) ??
      httpUrl(video?.dynamicCover),
    videoUrl:
      httpUrl(item.playAddr) ??
      httpUrl(video?.playAddr) ??
      httpUrl(video?.downloadAddr),
    authorName:
      asString(author?.nickname) ??
      asString(item.nickname) ??
      authorName ??
      itemHandle,
    publishedAt:
      unixToIso(item.createTime) ??
      unixToIso(item.create_time) ??
      unixToIso(video?.createTime) ??
      publishedAtFromVideoId(id) ??
      undefined,
  });
}

function firstFromItemList(
  list: unknown,
  handle: string,
  preferVideoId?: string,
  authorName?: string | null,
): TikTokPost | null {
  if (!Array.isArray(list)) return null;
  const posts = list.flatMap((item) => {
    const row = asRecord(item);
    const post = row ? postFromItem(row, handle, authorName) : null;
    return post ? [post] : [];
  });
  if (preferVideoId) {
    return posts.find((post) => post.videoId === preferVideoId) ?? posts[0] ?? null;
  }
  return posts[0] ?? null;
}

function fromProfileHydration(
  html: string,
  handle: string,
  preferVideoId?: string,
): TikTokPost | null {
  const data = asRecord(scriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__"));
  const scope = asRecord(data?.__DEFAULT_SCOPE__);
  if (!scope) return null;

  const detail = asRecord(scope["webapp.user-detail"]);
  const userInfo = asRecord(detail?.userInfo);
  const user = asRecord(userInfo?.user);
  const authorName = asString(user?.nickname);
  const fromDetail = firstFromItemList(
    userInfo?.itemList,
    handle,
    preferVideoId,
    authorName,
  );
  if (fromDetail) return fromDetail;

  const posts = asRecord(scope["webapp.user-post"]);
  return firstFromItemList(posts?.itemList, handle, preferVideoId, authorName);
}

function fromEmbedHydration(
  html: string,
  handle: string,
  preferVideoId?: string,
): TikTokPost | null {
  const data = asRecord(scriptJson(html, "__FRONTITY_CONNECT_STATE__"));
  const pages = asRecord(asRecord(data?.source)?.data);
  if (!pages) return null;

  for (const page of Object.values(pages)) {
    const row = asRecord(page);
    const userInfo = asRecord(row?.userInfo);
    const authorName = asString(userInfo?.nickname);
    const post = firstFromItemList(
      row?.videoList,
      handle,
      preferVideoId,
      authorName,
    );
    if (post) return post;
  }
  return null;
}

function hasMedia(post: TikTokPost | null) {
  return Boolean(post?.videoUrl || post?.thumbnailUrl);
}

export async function scrapeLatestTikTokVideo(
  profileUrl: string,
): Promise<TikTokPost | null> {
  const direct = parseTikTokVideoUrl(profileUrl);
  const handle = direct?.handle ?? parseTikTokProfileUrl(profileUrl);
  if (!handle) return null;

  const embedHtml = await fetchHtml(`https://www.tiktok.com/embed/@${handle}`);
  const fromEmbed = embedHtml
    ? fromEmbedHydration(embedHtml, handle, direct?.videoId)
    : null;
  if (hasMedia(fromEmbed)) return fromEmbed;

  const profileHtml = await fetchHtml(`https://www.tiktok.com/@${handle}`);
  const fromProfile = profileHtml
    ? fromProfileHydration(profileHtml, handle, direct?.videoId)
    : null;
  if (hasMedia(fromProfile)) return fromProfile;

  return fromEmbed ?? fromProfile ?? (direct ? toPost(direct.handle, direct.videoId) : null);
}
