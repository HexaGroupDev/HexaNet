export const MAX_PROCESS_LABELS = 3;

export type ProcessOption = {
  id: number;
  process_name: string;
  process_slug: string | null;
  process_labels: string[];
  parent_id: number | null;
};

export type ProcessLink = {
  title: string;
  link: string;
};

export function parseProcessLinks(value: unknown): ProcessLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is ProcessLink =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as ProcessLink).title === "string" &&
      typeof (entry as ProcessLink).link === "string",
  );
}

export function parseProcessLabels(value: unknown): string[] {
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
    if (unique.length === MAX_PROCESS_LABELS) break;
  }
  return unique;
}

export function toProcessOption(row: {
  id: number | string;
  process_name: string | null;
  process_slug: string | null;
  process_labels?: unknown;
  parent_id: number | string | null;
}): ProcessOption {
  return {
    id: Number(row.id),
    process_name: row.process_name?.trim() || "Untitled",
    process_slug: row.process_slug,
    process_labels: parseProcessLabels(row.process_labels),
    parent_id: row.parent_id == null ? null : Number(row.parent_id),
  };
}

export function collectProcessLabels(processes: ProcessOption[]): string[] {
  const unique: string[] = [];
  for (const process of processes) {
    for (const label of process.process_labels) {
      if (unique.some((item) => item.toLowerCase() === label.toLowerCase())) {
        continue;
      }
      unique.push(label);
    }
  }
  return unique.sort((a, b) => a.localeCompare(b));
}

export function filterProcessesByLabels(
  processes: ProcessOption[],
  selectedLabels: string[],
): ProcessOption[] {
  if (selectedLabels.length === 0) return processes;

  const selected = new Set(selectedLabels.map((label) => label.toLowerCase()));

  return processes.filter((process) =>
    process.process_labels.some((label) => selected.has(label.toLowerCase())),
  );
}
