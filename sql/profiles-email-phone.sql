-- Run in the Supabase SQL editor.
-- Adds email + phone on public.profiles and copies auth email onto the
-- profile row when a user signs up (and when their auth email changes).

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text;

create unique index if not exists profiles_email_key
  on public.profiles (email)
  where email is not null;

-- ---------------------------------------------------------------------------
-- Signup: insert a profiles row with the auth email.
-- Conflict: keep the existing row, fill email only if it is still empty.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url, permissions)
  values (
    new.id,
    nullif(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), '')
    ),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    'viewer'
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email)
    where public.profiles.email is null;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Keep profiles.email in sync if the auth email changes later.
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = nullif(new.email, '')
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public;
grant execute on function public.sync_profile_email() to supabase_auth_admin;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.sync_profile_email();

-- Backfill existing profiles from auth.users.
update public.profiles as p
set email = u.email
from auth.users as u
where p.id = u.id
  and p.email is null
  and u.email is not null
  and u.email <> '';
