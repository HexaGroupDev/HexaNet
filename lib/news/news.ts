export type NewsArticle = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  formattedDate: string;
  imageUrl: string | null;
  isLatest: boolean;
};

export function formatNewsDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function splitNewsBody(body: string) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [body.trim()].filter(Boolean);
}

const EXCERPT_CHAR_LIMIT = 220;

export function formatNewsExcerpt(body: string, maxLines = 3) {
  const normalized = body.trim();
  if (!normalized) return "";

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const preview = lines.slice(0, maxLines).join(" ");
  const fullText = lines.join(" ");
  const isTruncated =
    lines.length > maxLines ||
    preview.length < fullText.length ||
    preview.length > EXCERPT_CHAR_LIMIT;

  if (!isTruncated) return preview;

  const truncated =
    preview.length > EXCERPT_CHAR_LIMIT
      ? preview.slice(0, EXCERPT_CHAR_LIMIT).trimEnd()
      : preview;

  return `${truncated}...`;
}
