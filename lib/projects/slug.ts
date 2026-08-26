export function slugify(value: string, fallback = "item"): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function slugifyProjectName(name: string): string {
  return slugify(name, "project");
}

export function slugifyClientName(name: string): string {
  return slugify(name, "client");
}

export function slugifyProcessName(name: string): string {
  return slugify(name, "process");
}

/** First entry: `my-name`. Duplicates: `my-name-2`, `my-name-3`, … */
export function nextProjectSlug(
  base: string,
  existingSlugs: Iterable<string>,
): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Alias of {@link nextProjectSlug} for non-project entities. */
export const nextUniqueSlug = nextProjectSlug;

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
