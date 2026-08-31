import {
  isInstagramUrl,
  parseInstagramProfileUrl,
} from "@/lib/social/instagram";
import { createClient } from "@/lib/supabase/server";

export type InstagramEmbedConfig = {
  permalink: string;
  handle: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePermalink(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    let pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/";
    parsed.pathname = `${pathname}/`;
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export async function loadInstagramEmbed(): Promise<InstagramEmbedConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_embed_urls")
    .select("url")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load Instagram embed URL:", error.message);
    return null;
  }

  const url = (data ?? [])
    .map((row) => asString((row as { url?: unknown }).url))
    .find((value): value is string => !!value && isInstagramUrl(value));

  if (!url) return null;

  const permalink = normalizePermalink(url);
  const handle = parseInstagramProfileUrl(permalink);

  return { permalink, handle };
}
