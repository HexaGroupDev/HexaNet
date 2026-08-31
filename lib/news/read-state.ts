const STORAGE_KEY = "hexanet.news.read";

export function loadReadArticleIds(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter((id): id is string => typeof id === "string" && id.length > 0),
    );
  } catch {
    return new Set();
  }
}

export function saveReadArticleIds(ids: Set<string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function markArticleRead(
  ids: Set<string>,
  articleId: string,
): Set<string> {
  if (ids.has(articleId)) return ids;

  const next = new Set(ids);
  next.add(articleId);
  saveReadArticleIds(next);
  return next;
}
