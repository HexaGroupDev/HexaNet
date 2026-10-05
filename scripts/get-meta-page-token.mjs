import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const GRAPH_API_VERSION = "v26.0";
const REQUIRED_KEYS = ["META_LONG_USER_TOKEN"];
const TARGET_PAGE_ID = "417525835016057";
const TARGET_PAGE_NAME = "HexaGroup";

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

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.error) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Graph API request failed: ${message}`);
  }

  return payload;
}

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
const env = loadEnvLocal(envPath);
requireEnv(env, REQUIRED_KEYS);

const accounts = [];
let url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts`);
url.searchParams.set("fields", "id,name,access_token,tasks");
url.searchParams.set("access_token", env.META_LONG_USER_TOKEN);

while (url) {
  const payload = await fetchJson(url);
  accounts.push(...(payload.data ?? []));
  url = payload.paging?.next ?? null;
}

const page = accounts.find(
  (account) => account.id === TARGET_PAGE_ID && account.name === TARGET_PAGE_NAME
);

if (!page) {
  const summaries = accounts.map((account) => `${account.name} (${account.id})`);
  throw new Error(
    `Page ${TARGET_PAGE_NAME} (${TARGET_PAGE_ID}) was not found. Pages returned: ${
      summaries.length > 0 ? summaries.join(", ") : "(none)"
    }`
  );
}

const hasPageAccessToken = Boolean(page.access_token);

console.log("Page ID:");
console.log(page.id);
console.log("");
console.log("Page name:");
console.log(page.name);
console.log("");
console.log("tasks:");
console.log(Array.isArray(page.tasks) ? page.tasks.join(", ") : page.tasks ?? "(not returned)");
console.log("");
console.log("Page access token returned:");
console.log(hasPageAccessToken ? "yes" : "no");
console.log("");
console.log("Page access token:");
console.log(page.access_token ?? "(not returned)");
