#!/usr/bin/env node
/**
 * 控制端里带的建库 SQL，必须和 supabase/schema.sql 一模一样。
 *
 * 那段 SQL 有两份：一份是仓库里的文件（给会看代码的人），一份编进控制端
 * （给站长一键复制，因为「去仓库里找文件」对不写代码的人等于没说）。
 * 两份一旦不一致，站长按下按钮拿到的就是过期的规则——而这是权限规则，
 * 过期意味着权限不对。所以这里核对，不一致就不给过。
 *
 *   node scripts/check-schema.mjs
 */
import { readFile } from 'node:fs/promises'

const file = await readFile('supabase/schema.sql', 'utf8')
const module_ = await readFile('src/lib/schemaSql.ts', 'utf8')

const m = module_.match(/const TEMPLATE = String\.raw`([\s\S]*?)`\n\n/)
if (!m) {
  console.error('src/lib/schemaSql.ts 里找不到 SQL 模板')
  process.exit(1)
}
// 模板里为了嵌进模板字符串，转义过反引号和 ${
const embedded = m[1].replace(/\\`/g, '`').replace(/\\\$\{/g, '${')
// 文件里的站长那一行在模板里是占位符
const expected = file.replace("lower('CHANGE-ME@example.com')", "lower('__OWNER_EMAIL__')")

/* 规则本身也核一遍：改错一个 policy 的后果是别人看得到不该看的东西，
   而这种错误不会以任何别的方式表现出来。 */
const mustHave = [
  // 内容对所有人可读——这是站长明确要的「有链接就能看」
  [/create policy news_read\s+on public\.news\s+for select using \(true\)/, '新闻应当对所有人可读'],
  [/create policy studies_read\s+on public\.studies\s+for select using \(true\)/, '研究应当对所有人可读'],
  // 但名单和日志不行：名单里是别人的邮箱
  // 认 my_role()：直接内联 members 子查询会触发策略递归，见 schema.sql 里的说明。
  [/create policy members_read[\s\S]{0,300}public\.(me|my_role)\(\)/, '成员名单不该对所有人可读'],
  [/create policy changes_read\s+on public\.changes\s+for select using \(public\.can_edit\(\)\)/, '编辑日志不该对所有人可读'],
  // 写入一律要权限
  [/create policy news_write[\s\S]{0,120}can_edit/, '新闻写入必须要编辑权限'],
  [/create policy members_write[\s\S]{0,120}is_owner/, '成员名单只有站长能改'],
]
const ruleErrors = mustHave.filter(([re]) => !re.test(file)).map(([, why]) => why)
if (/members_read[\s\S]{0,80}using \(true\)/.test(file)) {
  ruleErrors.push('成员名单被设成了对所有人可读——里面是别人的邮箱地址')
}

console.log('PRISM 建库 SQL 检查')
console.log('—'.repeat(64))
for (const e of ruleErrors) console.log(`  错误  ${e}`)
if (embedded === expected && ruleErrors.length === 0) {
  console.log('  控制端里的 SQL 与 supabase/schema.sql 一致，权限规则也对。')
  console.log('—'.repeat(64))
  console.log('通过')
  process.exit(0)
}

// 指出第一处不同，省得让人自己比对两百行
const a = embedded.split('\n')
const b = expected.split('\n')
const i = a.findIndex((line, n) => line !== b[n])
if (embedded !== expected) console.log('  错误  两份 SQL 不一致。')
if (embedded !== expected && i >= 0) {
  console.log(`  第 ${i + 1} 行：`)
  console.log(`    控制端：${a[i] ?? '(没有这一行)'}`)
  console.log(`    文件里：${b[i] ?? '(没有这一行)'}`)
} else {
  console.log(`  行数不同：控制端 ${a.length} 行，文件 ${b.length} 行`)
}
console.log('—'.repeat(64))
console.log('改了 supabase/schema.sql 之后，重新生成 src/lib/schemaSql.ts。')
process.exit(1)
