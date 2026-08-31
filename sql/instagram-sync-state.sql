-- Run in the Supabase SQL editor after social-media-wall.sql.
-- Adds sync stamp for Instagram cache refresh (12h, same as TikTok).

insert into public.social_sync_state (id, last_updated)
values ('instagram', timestamptz '1970-01-01+00')
on conflict (id) do nothing;

-- Example profile URL:
-- insert into public.social_embed_urls (url, sort_order)
-- values ('https://www.instagram.com/YOUR_HANDLE/', 2)
-- on conflict (url) do nothing;
