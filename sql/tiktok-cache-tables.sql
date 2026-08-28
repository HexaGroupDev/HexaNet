-- Paste this in the Supabase SQL editor.
-- Creates the two cache tables the TikTok wall needs.
-- Does not touch social_embed_urls.

create table if not exists public.social_posts (
  id bigint generated always as identity primary key,
  platform text not null,
  external_id text not null,
  author_name text not null,
  text text,
  media_url text,
  thumbnail_url text,
  media_type text,
  post_url text not null,
  created_at timestamptz not null,
  likes integer,
  comments integer,
  fetched_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'social_posts_platform_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_platform_check
      check (platform in ('linkedin', 'instagram', 'tiktok'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'social_posts_media_type_check'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_media_type_check
      check (media_type is null or media_type in ('image', 'video'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'social_posts_platform_external_id_key'
      and conrelid = 'public.social_posts'::regclass
  ) then
    alter table public.social_posts
      add constraint social_posts_platform_external_id_key
      unique (platform, external_id);
  end if;
end $$;

create index if not exists social_posts_created_at_idx
  on public.social_posts (created_at desc);

alter table public.social_posts enable row level security;

revoke all on table public.social_posts from anon, authenticated, public;
grant select on table public.social_posts to authenticated;
grant select, insert, update, delete on table public.social_posts to service_role;

drop policy if exists "authenticated can read social posts" on public.social_posts;
create policy "authenticated can read social posts"
  on public.social_posts
  for select
  to authenticated
  using (true);

create table if not exists public.social_sync_state (
  id text primary key,
  last_updated timestamptz not null default timestamptz '1970-01-01+00'
);

insert into public.social_sync_state (id, last_updated)
values ('tiktok', timestamptz '1970-01-01+00')
on conflict (id) do nothing;

alter table public.social_sync_state enable row level security;

revoke all on table public.social_sync_state from anon, authenticated, public;
grant select, insert, update, delete on table public.social_sync_state to service_role;
