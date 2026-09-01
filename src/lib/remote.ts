/**
 * 跟数据库之间的读写。
 *
 * 一个原则贯穿全文件：**权限不在这里判断**。这里只管把数据搬来搬去；
 * 谁能读、谁能写由数据库的 policy 决定（见 supabase/schema.sql）。
 * 一个改了浏览器里代码的人，最多让自己屏幕上的按钮变得能按，
 * 真正的写入还是会被数据库挡回来。这是搬到后端的全部意义。
 *
 * 表里的列名是 snake_case，界面里的字段是 camelCase，翻译只在这一层做，
 * 免得数据库的写法渗到界面代码里。
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Account, Appearance, ChangeEntry, NewsItem, Role, SiteCopy, StudyItem,
} from './types'
import type { RegionKey } from './regions'
import { TOPIC_ALIAS } from './types'
import type { TopicKey } from './types'

export type { Role }

export interface Member extends Account {
  notify: boolean
}

export interface RemoteSnapshot {
  news: NewsItem[]
  studies: StudyItem[]
  copy: Partial<SiteCopy>
  appearance: Partial<Appearance>
  offline: boolean
  changes: ChangeEntry[]
  members: Member[]
}

/* ------------------------------------------------------------------ *
 * 行 ↔ 对象
 * ------------------------------------------------------------------ */

type Row = Record<string, unknown>

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : [])
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

/**
 * 把旧议题名翻译成现在的。
 *
 * 分类合并过（生育权→女性权利，跨性别→LGBTQIA+，平等和运动争议并回女性权利），
 * 而数据库里还留着旧名字的条目。不翻译的话，它们的标签会变成一个点不开、
 * 也显示不出中文的空壳。翻译一次，就不用为了改分类去改历史数据。
 */
function topicsOf(raw: unknown): TopicKey[] {
  const seen = new Set<TopicKey>()
  for (const t of arr<string>(raw)) {
    const key = (TOPIC_ALIAS[t] ?? t) as TopicKey
    seen.add(key)
  }
  return [...seen]
}

function toNews(r: Row): NewsItem {
  return {
    id: str(r.id),
    slug: str(r.slug),
    headline: str(r.headline),
    // 旧库里没有这一列（schema.sql 里有一句 add column if not exists 会补上）。
    // 读不到就当没有副标题，不要让整条新闻因此读不出来。
    subhead: (r.subhead ?? null) as string | null,
    summary: str(r.summary),
    bullets: arr<string>(r.bullets),
    regions: arr<RegionKey>(r.regions),
    topics: topicsOf(r.topics),
    links: arr<NewsItem['links'][number]>(r.links),
    image: (r.image ?? undefined) as NewsItem['image'],
    status: r.status === 'hidden' ? 'hidden' : 'live',
    origin: r.origin === 'auto' ? 'auto' : 'editor',
    featured: Boolean(r.featured),
    demo: Boolean(r.demo),
    editedByHuman: Boolean(r.edited_by_human),
    editorNote: (r.editor_note ?? undefined) as string | undefined,
    contentNotice: (r.content_notice ?? undefined) as string | undefined,
    publishedAt: str(r.published_at),
    updatedAt: str(r.updated_at),
  }
}

function fromNews(n: NewsItem): Row {
  return {
    id: n.id, slug: n.slug, headline: n.headline, subhead: n.subhead ?? null,
    summary: n.summary,
    bullets: n.bullets, regions: n.regions, topics: n.topics, links: n.links,
    image: n.image ?? null,
    status: n.status, origin: n.origin,
    featured: Boolean(n.featured), demo: Boolean(n.demo),
    edited_by_human: Boolean(n.editedByHuman),
    editor_note: n.editorNote ?? null,
    content_notice: n.contentNotice ?? null,
    published_at: n.publishedAt, updated_at: n.updatedAt,
  }
}

function toStudy(r: Row): StudyItem {
  return {
    id: str(r.id),
    slug: str(r.slug),
    title: str(r.title),
    publisher: str(r.publisher),
    kind: str(r.kind, 'report') as StudyItem['kind'],
    date: str(r.date),
    regions: arr<RegionKey>(r.regions),
    topics: topicsOf(r.topics),
    summary: str(r.summary),
    limitation: str(r.limitation),
    figures: arr<StudyItem['figures'][number]>(r.figures),
    links: arr<StudyItem['links'][number]>(r.links),
    datasetUrl: (r.dataset_url ?? undefined) as string | undefined,
    status: r.status === 'hidden' ? 'hidden' : 'live',
    origin: r.origin === 'auto' ? 'auto' : 'editor',
    demo: Boolean(r.demo),
  }
}

function fromStudy(s: StudyItem): Row {
  return {
    id: s.id, slug: s.slug, title: s.title, publisher: s.publisher, kind: s.kind,
    date: s.date, regions: s.regions, topics: s.topics, summary: s.summary,
    limitation: s.limitation, figures: s.figures, links: s.links,
    dataset_url: s.datasetUrl ?? null,
    status: s.status, origin: s.origin, demo: Boolean(s.demo),
    updated_at: new Date().toISOString(),
  }
}

function toMember(r: Row): Member {
  const role = str(r.role, 'member')
  return {
    email: str(r.email),
    name: (r.name ?? undefined) as string | undefined,
    role: (role === 'owner' || role === 'editor' ? role : 'member') as Role,
    notify: r.notify !== false,
    addedAt: str(r.added_at),
  }
}

/* ------------------------------------------------------------------ *
 * 读
 * ------------------------------------------------------------------ */

/** 一次把该有的都取回来。读不到的部分留空，不让一张表的问题拖垮整页。 */
export async function fetchAll(db: SupabaseClient): Promise<RemoteSnapshot> {
  const [news, studies, site, changes, members] = await Promise.all([
    db.from('news').select('*').order('published_at', { ascending: false }),
    db.from('studies').select('*').order('date', { ascending: false }),
    db.from('site').select('*').eq('id', 'site').maybeSingle(),
    db.from('changes').select('*').order('at', { ascending: false }).limit(200),
    db.from('members').select('*').order('added_at', { ascending: true }),
  ])

  return {
    news: (news.data ?? []).map(toNews),
    studies: (studies.data ?? []).map(toStudy),
    copy: (site.data?.copy ?? {}) as Partial<SiteCopy>,
    appearance: (site.data?.appearance ?? {}) as Partial<Appearance>,
    offline: Boolean(site.data?.offline),
    changes: (changes.data ?? []).map((r: Row) => ({
      id: str(r.id), at: str(r.at), who: str(r.who),
      kind: str(r.kind, 'edited') as ChangeEntry['kind'], text: str(r.text),
    })),
    members: (members.data ?? []).map(toMember),
  }
}

/* ------------------------------------------------------------------ *
 * 写
 * ------------------------------------------------------------------ */

export async function saveNews(db: SupabaseClient, items: NewsItem[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await db.from('news').upsert(items.map(fromNews))
  if (error) throw error
}

export async function removeNews(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('news').delete().eq('id', id)
  if (error) throw error
}

export async function saveStudies(db: SupabaseClient, items: StudyItem[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await db.from('studies').upsert(items.map(fromStudy))
  if (error) throw error
}

export async function removeStudy(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('studies').delete().eq('id', id)
  if (error) throw error
}

export async function saveSite(
  db: SupabaseClient,
  patch: { copy?: SiteCopy; appearance?: Appearance; offline?: boolean },
): Promise<void> {
  const row: Row = { id: 'site', updated_at: new Date().toISOString() }
  if (patch.copy) row.copy = patch.copy
  if (patch.appearance) row.appearance = patch.appearance
  if (patch.offline !== undefined) row.offline = patch.offline
  const { error } = await db.from('site').upsert(row)
  if (error) throw error
}

export async function logChange(db: SupabaseClient, entry: ChangeEntry): Promise<void> {
  // 记录写不进去不该挡住正事——内容已经存好了，日志少一条比操作失败强。
  await db.from('changes').insert({
    id: entry.id, at: entry.at, who: entry.who, kind: entry.kind, text: entry.text,
  })
}

/* ------------------------------------------------------------------ *
 * 成员
 * ------------------------------------------------------------------ */

export async function addMember(
  db: SupabaseClient,
  email: string,
  role: Role,
  by: string,
): Promise<void> {
  const { error } = await db.from('members').upsert({
    email: email.trim().toLowerCase(), role, added_by: by,
  })
  if (error) throw error
}

export async function setMemberRole(db: SupabaseClient, email: string, role: Role): Promise<void> {
  const { error } = await db.from('members').update({ role }).eq('email', email.toLowerCase())
  if (error) throw error
}

export async function setMemberNotify(db: SupabaseClient, email: string, notify: boolean): Promise<void> {
  const { error } = await db.from('members').update({ notify }).eq('email', email.toLowerCase())
  if (error) throw error
}

export async function removeMember(db: SupabaseClient, email: string): Promise<void> {
  const { error } = await db.from('members').delete().eq('email', email.toLowerCase())
  if (error) throw error
}

/* ------------------------------------------------------------------ *
 * 实时
 * ------------------------------------------------------------------ */

/**
 * 有人改了东西，其他人不用刷新就能看到。
 *
 * 不去分辨改了哪一行——整份重取一次最省心，数据量在这个规模下微不足道，
 * 而增量合并出错的方式有很多种，每一种都表现为「别人看到的跟你不一样」。
 */
export function watch(db: SupabaseClient, onChange: () => void): () => void {
  const channel = db
    .channel('prism-content')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'studies' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, onChange)
    .subscribe()
  return () => { void db.removeChannel(channel) }
}
