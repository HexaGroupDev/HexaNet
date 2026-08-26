-- Run in the Supabase SQL editor.
-- Company social wall: cached posts the dashboard reads, plus account
-- credentials the cron job uses. Tokens never leave the service role.

-- ---------------------------------------------------------------------------
-- Cached posts (dashboard reads these; cron writes them)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Connected company accounts (cron / service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.social_accounts (
  id bigint generated always as identity primary key,
  platform text not null,
  account_id text not null,
  account_name text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  enabled boolean not null default true
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'social_accounts_platform_check'
      and conrelid = 'public.social_accounts'::regclass
  ) then
    alter table public.social_accounts
      add constraint social_accounts_platform_check
      check (platform in ('linkedin', 'instagram', 'tiktok'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'social_accounts_platform_account_id_key'
      and conrelid = 'public.social_accounts'::regclass
  ) then
    alter table public.social_accounts
      add constraint social_accounts_platform_account_id_key
      unique (platform, account_id);
  end if;
end $$;

alter table public.social_accounts enable row level security;

revoke all on table public.social_accounts from anon, authenticated, public;
grant select, insert, update, delete on table public.social_accounts to service_role;
