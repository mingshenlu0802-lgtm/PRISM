/**
 * 建库用的 SQL，跟控制端一起带着走。
 *
 * 本来这一步是「去仓库里找 supabase/schema.sql」——对一个不写代码的人来说，
 * 这句话等于没说：他不知道仓库长什么样，也不知道怎么在里面找文件。
 * 所以把内容放进来，控制端里一个按钮就能复制，连带把站长邮箱替换好，
 * 原来那个「记得改最后一行」的坑也一起消失。
 *
 * 这份内容跟 supabase/schema.sql 必须一致；`npm run check` 会核对，不一致就不给过。
 */

const TEMPLATE = String.raw`-- PRISM — database schema and access rules.
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
  'Who may EDIT, and who gets email. Reading needs no account — see the policies below.';

-- The signed-in person's email, lower-cased. Every rule below leans on it.
create or replace function public.me()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where email = public.me();
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
  subhead      text,
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

-- 已经建过库的要补这一列。
-- create table if not exists 对已存在的表什么都不做，所以新增字段必须单独写。
-- 这一句可以反复执行。
alter table public.news add column if not exists subhead text;

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

-- CONTENT IS READABLE BY ANYONE WITH THE LINK.
--
-- That is deliberate: friends should be able to open the site and read it
-- without making an account. It also means the link IS the access control —
-- forward it to anyone and they can read. The site is unlisted, not private.
-- Sign-in exists so the owner knows who to email, and so editors can edit.
create policy news_read     on public.news    for select using (true);
create policy studies_read  on public.studies for select using (true);
create policy site_read     on public.site    for select using (true);

-- Writing is another matter entirely: only the owner and editors.
create policy news_write    on public.news    for all
  using (public.can_edit()) with check (public.can_edit());
create policy studies_write on public.studies for all
  using (public.can_edit()) with check (public.can_edit());
create policy site_write    on public.site    for all
  using (public.can_edit()) with check (public.can_edit());

-- The member list is NOT public. It holds other people's email addresses,
-- which are theirs, not the site's. Only signed-in members see it; only the
-- owner changes it.
--
-- The test has to go through my_role(). Inlining a select over members here
-- would make the policy read the table it guards, and Postgres refuses with
-- "infinite recursion detected in policy for relation members". Nothing can
-- then read the list at all — and the cost is not a missing list. The site
-- learns who you are from that read, so the owner signs in, the site cannot
-- tell it is them, and the console entry never appears: locked out of their
-- own desk while apparently logged in. my_role() is security definer, so it
-- bypasses RLS and cannot recurse.
create policy members_read  on public.members for select
  using (public.my_role() is not null);
create policy members_write on public.members for all
  using (public.is_owner()) with check (public.is_owner());

-- The edit log is internal: who changed what, and when. Editors only.
create policy changes_read  on public.changes for select using (public.can_edit());
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
-- Only the owner can add members, so the first row has to be inserted here,
-- once. This is the account that will be able to edit the site.
--
-- Replace the address below with YOUR email, then run this file.

insert into public.members (email, role, name, added_by)
values (lower('__OWNER_EMAIL__'), 'owner', '站长', 'setup')
on conflict (email) do update set role = 'owner';
`

/** 把 SQL 交出去，站长那一行已经填成他自己的地址。 */
export function schemaSqlFor(ownerEmail: string): string {
  return TEMPLATE.replace('__OWNER_EMAIL__', ownerEmail.trim().toLowerCase())
}

/** 原样的模板，给一致性检查用。 */
export const SCHEMA_TEMPLATE = TEMPLATE
