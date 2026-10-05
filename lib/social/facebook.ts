export type FacebookPost = {
  platform: "facebook";
  postId: string;
  handle: string | null;
  postUrl: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  publishedAt: string;
};

const DEFAULT_AUTHOR = "HexaGroup";

export function toPost(
  postId: string,
  extras: Partial<Omit<FacebookPost, "platform" | "postId">> = {},
): FacebookPost {
  return {
    platform: "facebook",
    postId,
    handle: extras.handle?.replace(/^@/, "") || null,
    postUrl: extras.postUrl ?? null,
    caption: extras.caption ?? null,
    thumbnailUrl: extras.thumbnailUrl ?? null,
    videoUrl: extras.videoUrl ?? null,
    authorName: extras.authorName?.trim() || DEFAULT_AUTHOR,
    publishedAt: extras.publishedAt ?? new Date().toISOString(),
  };
}
