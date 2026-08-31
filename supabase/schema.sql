-- PRISM — database schema and access rules.
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once.
--
-- What it sets up:
--   members  — who may read, who may edit, who gets email
--   news / studies / site / changes — the content everyone shares
--
-- Every rule below is enforced by the DATABASE, not by the website. That is
-- the whole point of moving off a static site: a visitor who edits the page
-- in their browser still cannot write a row they have no right to write.

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------

create table if not exists public.members (
  email      text primary key,
  role       text not null default 'member' check (role in ('owner', 'editor', 'member')),
  name       text,
  notify     boolean not null default true,
  added_at   timestamptz not null default now(),
  added_by   text
);

comment on table public.members is
  'Who may open this site. Not on this list = cannot read anything.';

-- The signed-in person's email, lower-cased. Every rule below leans on it.
create or replace function public.me()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where email = public.me();
$$;

create or replace function public.can_read()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = public.me());
$$;

create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where email = public.me() and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where email = public.me() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- content
-- ---------------------------------------------------------------------------

create table if not exists public.news (
  id           text primary key,
  slug         text not null unique,
  headline     text not null,
  summary      text not null default '',
  bullets      jsonb not null default '[]'::jsonb,
  regions      jsonb not null default '[]'::jsonb,
  topics       jsonb not null default '[]'::jsonb,
  links        jsonb not null default '[]'::jsonb,
  image        jsonb,
  status       text not null default 'live' check (status in ('live', 'hidden')),
  origin       text not null default 'editor' check (origin in ('auto', 'editor')),
  featured     boolean not null default false,
  demo         boolean not null default false,
  edited_by_human boolean not null default false,
  editor_note  text,
  content_notice text,
  published_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.studies (
  id           text primary key,
  slug         text not null unique,
  title        text not null,
  publisher    text not null default '',
  kind         text not null default 'report',
  summary      text not null default '',
  limitation   text not null default '',
  figures      jsonb not null default '[]'::jsonb,
  regions      jsonb not null default '[]'::jsonb,
  topics       jsonb not null default '[]'::jsonb,
  links        jsonb not null default '[]'::jsonb,
  dataset_url  text,
  status       text not null default 'live' check (status in ('live', 'hidden')),
  origin       text not null default 'editor',
  demo         boolean not null default false,
  date         text,
  updated_at   timestamptz not null default now()
);

-- One row, id = 'site'. Holds the wording and the appearance everyone sees.
create table if not exists public.site (
  id          text primary key default 'site',
  copy        jsonb not null default '{}'::jsonb,
  appearance  jsonb not null default '{}'::jsonb,
  offline     boolean not null default false,
  updated_at  timestamptz not null default now()
);
insert into public.site (id) values ('site') on conflict (id) do nothing;

create table if not exists public.changes (
  id      text primary key,
  at      timestamptz not null default now(),
  who     text not null,
  kind    text not null,
  text    text not null
);

create index if not exists changes_at_idx on public.changes (at desc);
create index if not exists news_published_idx on public.news (published_at desc);

-- ---------------------------------------------------------------------------
-- access rules
-- ---------------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.news    enable row level security;
alter table public.studies enable row level security;
alter table public.site    enable row level security;
alter table public.changes enable row level security;

-- Rerunning the file should replace the rules, not fail on them.
drop policy if exists members_read   on public.members;
drop policy if exists members_write  on public.members;
drop policy if exists news_read      on public.news;
drop policy if exists news_write     on public.news;
drop policy if exists studies_read   on public.studies;
drop policy if exists studies_write  on public.studies;
drop policy if exists site_read      on public.site;
drop policy if exists site_write     on public.site;
drop policy if exists changes_read   on public.changes;
drop policy if exists changes_write  on public.changes;

-- Members: anyone on the list can see who else is on it. Only the owner edits it.
create policy members_read  on public.members for select using (public.can_read());
create policy members_write on public.members for all
  using (public.is_owner()) with check (public.is_owner());

-- Content: members read, editors and the owner write.
create policy news_read     on public.news    for select using (public.can_read());
create policy news_write    on public.news    for all
  using (public.can_edit()) with check (public.can_edit());

create policy studies_read  on public.studies for select using (public.can_read());
create policy studies_write on public.studies for all
  using (public.can_edit()) with check (public.can_edit());

create policy site_read     on public.site    for select using (public.can_read());
create policy site_write    on public.site    for all
  using (public.can_edit()) with check (public.can_edit());

-- The log is append-only for editors: you may add an entry, never rewrite one.
create policy changes_read  on public.changes for select using (public.can_read());
create policy changes_write on public.changes for insert with check (public.can_edit());

-- ---------------------------------------------------------------------------
-- live updates
-- ---------------------------------------------------------------------------

-- Lets the site push changes to everyone who has it open, without a refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'news'
  ) then
    alter publication supabase_realtime add table public.news, public.studies, public.site, public.members;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- the first account
-- ---------------------------------------------------------------------------
--
-- Nobody can read anything until there is at least one member, and only the
-- owner can add members — so the first row has to be inserted here, once.
--
-- Replace the address below with YOUR email, then run this file.

insert into public.members (email, role, name, added_by)
values (lower('CHANGE-ME@example.com'), 'owner', '站长', 'setup')
on conflict (email) do update set role = 'owner';
