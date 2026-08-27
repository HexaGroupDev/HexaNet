import { getPlatformCredentials } from "@/lib/social/accounts";
import { postId } from "@/lib/social/posts";
import type { SocialPost } from "@/lib/social/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stripCommentary(text: string) {
  return text
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\{hashtag\|\\?#\|([^}]+)\}/g, "#$1")
    .trim();
}

function postUrlFromUrn(urn: string) {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`;
}

function toPost(
  element: Record<string, unknown>,
  author: string,
): SocialPost | null {
  const id = asString(element.id);
  if (!id) return null;

  const createdAtMs =
    asNumber(element.publishedAt) ?? asNumber(element.createdAt);
  if (createdAtMs == null) return null;

  const commentary = asString(element.commentary);
  const content = isRecord(element.content) ? element.content : null;
  const article = content && isRecord(content.article) ? content.article : null;
  const articleTitle = article ? asString(article.title) : undefined;
  const landing = asString(element.contentLandingPage);

  return {
    id: postId("linkedin", id),
    platform: "linkedin",
    author,
    text: commentary ? stripCommentary(commentary) : articleTitle,
    postUrl: landing ?? postUrlFromUrn(id),
    createdAt: new Date(createdAtMs).toISOString(),
  };
}

export async function fetchLinkedInPosts(limit = 8): Promise<SocialPost[]> {
  const credentials = await getPlatformCredentials("linkedin");
  if (!credentials) return [];

  const version = process.env.LINKEDIN_VERSION?.trim() || "202608";
  const authorUrn = `urn:li:organization:${credentials.accountId}`;
  const url = new URL("https://api.linkedin.com/rest/posts");
  url.searchParams.set("q", "author");
  url.searchParams.set("author", authorUrn);
  url.searchParams.set("count", String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set("sortBy", "CREATED");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Linkedin-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
      "X-RestLi-Method": "FINDER",
    },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (isRecord(body) ? asString(body.message) : undefined) ??
      `LinkedIn API ${response.status}`;
    throw new Error(message);
  }

  const elements =
    isRecord(body) && Array.isArray(body.elements)
      ? body.elements.filter(isRecord)
      : [];

  return elements.flatMap((element) => {
    const post = toPost(element, credentials.accountName);
    return post ? [post] : [];
  });
}
