import { slugify } from "@/lib/projects/slug";

export function slugifyProfileName(name: string) {
  return slugify(name, "profile");
}

export function profilePath(username: string) {
  return `/dashboard/profile/${slugifyProfileName(username)}`;
}

export function findProfileBySlug<T extends { username: string | null }>(
  profiles: T[],
  slug: string,
) {
  return (
    profiles.find(
      (profile) =>
        typeof profile.username === "string" &&
        profile.username.trim() !== "" &&
        slugifyProfileName(profile.username) === slug,
    ) ?? null
  );
}
