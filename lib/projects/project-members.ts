export type ProjectMember = {
  member_id: string;
  joined_at: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function parseProjectMembers(value: unknown): ProjectMember[] {
  if (!Array.isArray(value)) return [];

  const members: ProjectMember[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry === "string") {
      const memberId = entry.trim();
      if (!memberId || !isUuid(memberId) || seen.has(memberId)) continue;
      seen.add(memberId);
      members.push({ member_id: memberId, joined_at: null });
      continue;
    }

    if (!entry || typeof entry !== "object") continue;

    const row = entry as {
      member_id?: unknown;
      joined_at?: unknown;
    };
    if (typeof row.member_id !== "string") continue;

    const memberId = row.member_id.trim();
    if (!memberId || !isUuid(memberId) || seen.has(memberId)) continue;

    seen.add(memberId);
    members.push({
      member_id: memberId,
      joined_at:
        typeof row.joined_at === "string" && row.joined_at.trim()
          ? row.joined_at
          : null,
    });
  }

  return members;
}

export function memberIdsFromProjectMembers(value: unknown): string[] {
  return parseProjectMembers(value).map((member) => member.member_id);
}
