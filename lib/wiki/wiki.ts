export const MAX_WIKI_LABELS = 3;

export type WikiEntry = {
  id: number;
  wiki_question: string;
  wiki_answer: string;
  wiki_labels: string[];
};

export function parseWikiLabels(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? [value]
      : [];

  const unique: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (unique.some((label) => label.toLowerCase() === trimmed.toLowerCase())) {
      continue;
    }
    unique.push(trimmed);
    if (unique.length === MAX_WIKI_LABELS) break;
  }
  return unique;
}

export function toWikiEntry(row: {
  id: number | string;
  wiki_question: string | null;
  wiki_answer: string | null;
  wiki_labels?: unknown;
}): WikiEntry {
  return {
    id: Number(row.id),
    wiki_question: row.wiki_question?.trim() || "Untitled",
    wiki_answer: row.wiki_answer?.trim() || "",
    wiki_labels: parseWikiLabels(row.wiki_labels),
  };
}

export function collectWikiLabels(entries: WikiEntry[]): string[] {
  const unique: string[] = [];
  for (const entry of entries) {
    for (const label of entry.wiki_labels) {
      if (unique.some((item) => item.toLowerCase() === label.toLowerCase())) {
        continue;
      }
      unique.push(label);
    }
  }
  return unique.sort((a, b) => a.localeCompare(b));
}

export function filterWikiByLabels(
  entries: WikiEntry[],
  selectedLabels: string[],
): WikiEntry[] {
  if (selectedLabels.length === 0) return entries;

  const selected = new Set(selectedLabels.map((label) => label.toLowerCase()));

  return entries.filter((entry) =>
    entry.wiki_labels.some((label) => selected.has(label.toLowerCase())),
  );
}
