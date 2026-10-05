import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Instagram Login tokens use graph.instagram.com, not graph.facebook.com.
const GRAPH_API_VERSION = "v21.0";
const REQUIRED_KEYS = ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_ACCOUNT_ID"];
const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
];

function loadEnvLocal(envPath) {
  const env = {};
  const contents = readFileSync(envPath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function requireEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars in .env.local: ${missing.join(", ")}`);
  }
}

function redactAccessTokens(value) {
  if (typeof value === "string") {
    try {
      const parsed = new URL(value);
      if (parsed.searchParams.has("access_token")) {
        parsed.searchParams.set("access_token", "[redacted]");
        return parsed.toString();
      }
    } catch {
      // Not a URL.
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactAccessTokens);
  }

  if (value && typeof value === "object") {
    const redacted = {};
    for (const [key, nested] of Object.entries(value)) {
      redacted[key] = key === "access_token" ? "[redacted]" : redactAccessTokens(nested);
    }
    return redacted;
  }

  return value;
}

function publicMediaFields(item) {
  if (!item || typeof item !== "object") return null;
  const media = {};
  for (const field of MEDIA_FIELDS) {
    if (field in item) media[field] = item[field];
  }
  return redactAccessTokens(media);
}

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
const env = loadEnvLocal(envPath);
requireEnv(env, REQUIRED_KEYS);

const url = new URL(
  `https://graph.instagram.com/${GRAPH_API_VERSION}/${encodeURIComponent(env.INSTAGRAM_ACCOUNT_ID)}/media`,
);
url.searchParams.set("fields", MEDIA_FIELDS.join(","));
url.searchParams.set("limit", "1");
url.searchParams.set("access_token", env.INSTAGRAM_ACCESS_TOKEN);

const response = await fetch(url);
const payload = await response.json();
const printable = redactAccessTokens(payload);

if (!response.ok || payload.error) {
  console.log("Graph API error:");
  console.log(JSON.stringify(printable, null, 2));
  process.exitCode = 1;
} else {
  const item = Array.isArray(payload.data) ? payload.data[0] : undefined;
  console.log("Latest Instagram media:");
  console.log(JSON.stringify(publicMediaFields(item) ?? null, null, 2));
}
