-- Run in the Supabase SQL editor.
-- Company news feed for the HexaNet dashboard.

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

-- Migrate older news_articles schemas to the simplified model.
alter table public.news_articles
  add column if not exists body text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'news_articles'
      and column_name = 'paragraphs'
  ) then
    execute $sql$
      update public.news_articles
      set body = coalesce(
        nullif(trim(array_to_string(paragraphs, E'\n\n')), ''),
        excerpt,
        ''
      )
      where body is null or body = ''
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'news_articles'
      and column_name = 'excerpt'
  ) then
    execute $sql$
      update public.news_articles
      set body = coalesce(excerpt, '')
      where body is null or body = ''
    $sql$;
  end if;
end $$;

update public.news_articles
set body = ''
where body is null;

alter table public.news_articles
  alter column body set default '';

alter table public.news_articles
  alter column body set not null;

drop index if exists news_articles_published_at_idx;

create index if not exists news_articles_created_at_idx
  on public.news_articles (created_at desc);

alter table public.news_articles
  drop constraint if exists news_articles_slug_key;

alter table public.news_articles
  drop column if exists slug,
  drop column if exists excerpt,
  drop column if exists paragraphs,
  drop column if exists published_at;

alter table public.news_articles enable row level security;

revoke all on table public.news_articles from anon, authenticated, public;
grant select on table public.news_articles to authenticated;
grant select, insert, update, delete on table public.news_articles to service_role;

drop policy if exists "authenticated can read news articles" on public.news_articles;
create policy "authenticated can read news articles"
  on public.news_articles
  for select
  to authenticated
  using (true);

grant insert, update, delete on table public.news_articles to authenticated;

drop policy if exists "admins can insert news articles" on public.news_articles;
create policy "admins can insert news articles"
  on public.news_articles
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

drop policy if exists "admins can update news articles" on public.news_articles;
create policy "admins can update news articles"
  on public.news_articles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

drop policy if exists "admins can delete news articles" on public.news_articles;
create policy "admins can delete news articles"
  on public.news_articles
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

-- News article hero images (public read, admin write).
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

drop policy if exists "news images are public" on storage.objects;
create policy "news images are public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'news-images');

drop policy if exists "admins can upload news images" on storage.objects;
create policy "admins can upload news images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

drop policy if exists "admins can update news images" on storage.objects;
create policy "admins can update news images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'news-images'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

drop policy if exists "admins can delete news images" on storage.objects;
create policy "admins can delete news images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'news-images'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.permissions = 'admin'
    )
  );

insert into public.news_articles (title, body, created_at)
select
  'Hexagroup''s attempts to steal the moon yields great promise',
  'Hexagroup''s efforts at stealing the moon are not created in vain. What began as an ambitious internal pitch has quickly become one of the company''s most closely watched initiatives, drawing attention from partners, investors, and at least one very confused astronomer.

According to early reports, the project team has made "remarkable progress" on launch logistics, orbital positioning, and the far more difficult question of where to put it once it arrives. A spokesperson declined to confirm whether the moon would remain in orbit or be stored on-site for branding purposes.

Industry analysts remain divided. Supporters call the effort a bold statement of intent. Critics argue that stealing the moon may present regulatory challenges, particularly around international space law, employee parking, and nighttime visibility.

For now, Hexagroup says it remains committed to the mission. "If we can build great products," the team wrote in an internal memo, "we can probably figure out the rest of the solar system too."',
  '2026-08-28T12:00:00Z'::timestamptz
where not exists (
  select 1
  from public.news_articles
  where title = 'Hexagroup''s attempts to steal the moon yields great promise'
);

insert into public.news_articles (title, body, created_at)
select
  'Hexagroup opens a new wing dedicated entirely to nap pods',
  'Hexagroup has unveiled a new office wing designed around rest, focus, and the belief that great ideas often arrive horizontally. The space includes twelve nap pods, a cereal bar, and a mural that leadership insists will "unlock collective creativity."

Facilities staff say the pods have already seen heavy use, especially after lunch and during meetings that could have been emails. Early feedback suggests the cereal bar may be the true breakout feature of the quarter.

Leadership framed the expansion as an investment in people first. Employees mostly framed it as an investment in not falling asleep at their desks.',
  '2026-08-25T12:00:00Z'::timestamptz
where not exists (
  select 1
  from public.news_articles
  where title = 'Hexagroup opens a new wing dedicated entirely to nap pods'
);

insert into public.news_articles (title, body, created_at)
select
  'Major retail client signs on for a full brand refresh',
  'Hexagroup has signed a major retail client for a full brand refresh spanning packaging, digital, and launch creative. The work is expected to roll out over the next two quarters.

The client said it chose Hexagroup for its ability to move quickly without losing craft. Hexagroup said it chose the client for having a budget and a general appreciation for fonts.

Both sides described the kickoff as enthusiastic, caffeinated, and only mildly derailed by a debate over whether the hero image should feature a dog.',
  '2026-08-21T12:00:00Z'::timestamptz
where not exists (
  select 1
  from public.news_articles
  where title = 'Major retail client signs on for a full brand refresh'
);

insert into public.news_articles (title, body, created_at)
select
  'Summer interns present ideas ranging from brilliant to legally complicated',
  'Hexagroup''s summer intern showcase wrapped this week with presentations across product, design, and strategy. Several concepts drew immediate interest from leadership.

Standout projects included a streamlined client dashboard, a smarter content workflow, and a loyalty program that someone in finance described as "financially ambitious."

The program closed with praise for the intern class and a reminder that all future moon-related proposals must go through compliance first.',
  '2026-08-16T12:00:00Z'::timestamptz
where not exists (
  select 1
  from public.news_articles
  where title = 'Summer interns present ideas ranging from brilliant to legally complicated'
);
