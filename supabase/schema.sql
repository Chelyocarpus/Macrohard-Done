-- Cloud sync for Macrohard Done (proof of concept).
-- Run once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Safe to run again, and it also upgrades the first version of this file (one row per account).
--
-- One row per PROFILE (Personal, Work, ...) holds that profile's whole app data as the same JSON text the
-- "Export a backup" button makes. `version` goes up by one every time the data is saved; the app only saves
-- when the version it last saw is still the current one (see src/sync/supabaseRemote.ts), so two devices can't
-- silently overwrite each other. The profile's name and colour sit in their own columns so a new device can list
-- the account's profiles without downloading their data.

create table if not exists public.user_snapshots (
  user_id            uuid        not null references auth.users (id) on delete cascade,
  profile_id         text        not null default 'default' check (profile_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  profile_name       text        not null default 'Personal' check (char_length(profile_name) between 1 and 60),
  profile_color      text        not null default '#3b82f6' check (profile_color ~ '^#[0-9A-Fa-f]{6}$'),
  profile_updated_at timestamptz not null default now(),
  payload            text        not null check (octet_length(payload) <= 8000000),
  version            bigint      not null default 1 check (version >= 1),
  updated_at         timestamptz not null default now(),
  primary key (user_id, profile_id)
);

-- Upgrade from the first version (a single row per account): existing rows become the profile "default".
alter table public.user_snapshots add column if not exists profile_id text not null default 'default';
alter table public.user_snapshots add column if not exists profile_name text not null default 'Personal';
alter table public.user_snapshots add column if not exists profile_color text not null default '#3b82f6';
alter table public.user_snapshots add column if not exists profile_updated_at timestamptz not null default now();
alter table public.user_snapshots drop constraint if exists user_snapshots_pkey;
alter table public.user_snapshots add primary key (user_id, profile_id);

alter table public.user_snapshots enable row level security;

-- Everyone can only touch their own rows.
drop policy if exists "read own snapshot"   on public.user_snapshots;
drop policy if exists "insert own snapshot" on public.user_snapshots;
drop policy if exists "update own snapshot" on public.user_snapshots;
drop policy if exists "delete own snapshot" on public.user_snapshots;

create policy "read own snapshot" on public.user_snapshots
  for select using (auth.uid() = user_id);

create policy "insert own snapshot" on public.user_snapshots
  for insert with check (auth.uid() = user_id and version = 1);

create policy "update own snapshot" on public.user_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deleting a profile in the app removes its row.
create policy "delete own snapshot" on public.user_snapshots
  for delete using (auth.uid() = user_id);

-- Saving the data must raise the version by exactly one, whatever the client sends. Changing only the profile's
-- name or colour leaves the version alone. A row can never be moved to another profile or account.
create or replace function public.user_snapshots_bump_version() returns trigger
language plpgsql as $$
begin
  if new.user_id <> old.user_id or new.profile_id <> old.profile_id then
    raise exception 'a snapshot cannot change its owner or profile' using errcode = '42501';
  end if;
  if new.payload is distinct from old.payload or new.version <> old.version then
    if new.version <> old.version + 1 then
      raise exception 'version must increase by exactly 1 (was %, got %)', old.version, new.version
        using errcode = '40001';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists user_snapshots_bump_version on public.user_snapshots;
create trigger user_snapshots_bump_version
  before update on public.user_snapshots
  for each row execute function public.user_snapshots_bump_version();
