-- Instagram Graph API setup (one-time).
-- Tokens are stored in social_accounts and auto-refreshed by the app (~10 days before expiry).
--
-- 1. Create a Meta app: https://developers.facebook.com/
-- 2. Add Instagram product → "API setup with Instagram login" (or Facebook login + IG business)
-- 3. Generate a long-lived user access token for @hexagroupdigital
-- 4. Note the Instagram user ID (numeric) from Graph API Explorer or /me?fields=id,username
-- 5. Insert the row below (service_role only — tokens are not readable by dashboard users)

insert into public.social_accounts (
  platform,
  account_id,
  account_name,
  access_token,
  token_expires_at,
  enabled
)
values (
  'instagram',
  'YOUR_IG_USER_ID',           -- e.g. 17841400000000000 or use env INSTAGRAM_USER_ID=me
  'hexagroupdigital',
  'YOUR_LONG_LIVED_TOKEN',
  (now() + interval '60 days'), -- approximate; update after first refresh
  true
)
on conflict (platform, account_id) do update
set
  account_name = excluded.account_name,
  access_token = excluded.access_token,
  token_expires_at = excluded.token_expires_at,
  enabled = excluded.enabled;

-- Alternative: set env vars in .env.local (refresh won't persist without social_accounts row):
--   INSTAGRAM_ACCESS_TOKEN=...
--   INSTAGRAM_USER_ID=me          (or numeric IG user id)
--   INSTAGRAM_USERNAME=hexagroupdigital
--   INSTAGRAM_TOKEN_EXPIRES_AT=2026-06-01T00:00:00.000Z  (optional, enables refresh timing)
