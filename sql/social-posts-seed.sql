-- Optional. Run after social-media-wall.sql if you want to preview the wall
-- before any platform APIs are connected. Delete these rows once real posts
-- start syncing:
--   delete from public.social_posts where external_id like 'seed-%';

insert into public.social_posts (
  platform,
  external_id,
  author_name,
  text,
  media_url,
  thumbnail_url,
  media_type,
  post_url,
  created_at,
  likes,
  comments
)
values
  (
    'instagram',
    'seed-instagram-1',
    'hexagroup',
    'Studio day. New work on the wall.',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
    null,
    'image',
    'https://www.instagram.com/',
    now() - interval '2 hours',
    48,
    6
  ),
  (
    'linkedin',
    'seed-linkedin-1',
    'Hexa Group',
    'We are hiring across strategy, design, and engineering. If you want to build with a small, senior team, take a look at our open roles.',
    null,
    null,
    null,
    'https://www.linkedin.com/',
    now() - interval '5 hours',
    32,
    4
  ),
  (
    'tiktok',
    'seed-tiktok-1',
    'hexagroup',
    'A quick look behind the scenes.',
    null,
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
    'video',
    'https://www.tiktok.com/',
    now() - interval '1 day',
    210,
    18
  ),
  (
    'instagram',
    'seed-instagram-2',
    'hexagroup',
    'Details from a recent install.',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&q=80',
    null,
    'image',
    'https://www.instagram.com/',
    now() - interval '2 days',
    91,
    11
  )
on conflict (platform, external_id) do update
set
  author_name = excluded.author_name,
  text = excluded.text,
  media_url = excluded.media_url,
  thumbnail_url = excluded.thumbnail_url,
  media_type = excluded.media_type,
  post_url = excluded.post_url,
  created_at = excluded.created_at,
  likes = excluded.likes,
  comments = excluded.comments,
  fetched_at = now();
