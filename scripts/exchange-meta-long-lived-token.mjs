import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GRAPH_API_VERSION = "v26.0";
const REQUIRED_KEYS = ["META_APP_ID", "META_APP_SECRET", "META_SHORT_USER_TOKEN"];

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

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
const env = loadEnvLocal(envPath);
requireEnv(env, REQUIRED_KEYS);

const params = new URLSearchParams({
  grant_type: "fb_exchange_token",
  client_id: env.META_APP_ID,
  client_secret: env.META_APP_SECRET,
  fb_exchange_token: env.META_SHORT_USER_TOKEN,
});

const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`;
const response = await fetch(url);
const payload = await response.json();

if (!response.ok || payload.error) {
  const message = payload?.error?.message ?? `HTTP ${response.status}`;
  throw new Error(`Token exchange failed: ${message}`);
}

if (!payload.access_token) {
  throw new Error("Token exchange succeeded but no access_token was returned.");
}

console.log("long-lived user access token:");
console.log(payload.access_token);
console.log("");
console.log("expires_in:");
console.log(payload.expires_in ?? "(not returned)");
