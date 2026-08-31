# 把网址里的名字换掉

**全程在浏览器里点，不用命令行。约 10 分钟，免费。**

---

## 先看清楚名字是从哪来的

你现在的网址：

```
https://mingshenlu0802-lgtm.github.io/PRISM/
        └────────┬─────────┘  └─┬─┘
         你的 GitHub 账号名      仓库名
```

GitHub Pages 的网址格式是写死的：**`账号名.github.io/仓库名/`**。

所以名字不在代码里 —— 代码里一个字都没有你的信息，每次发布前都有一道
`npm run privacy` 检查在挡着，出现邮箱地址就直接不发布。
**名字来自「这个仓库挂在谁名下」。** 想换掉它，就得换一个「谁」。

---

## 三条路，挑一条

| | 做法 | 花多久 | 花钱 | 换完的网址 |
|---|---|---|---|---|
| **A** | 建一个免费的组织，把仓库转过去 | 10 分钟 | 免费 | `prism-lens.github.io/PRISM/` |
| **B** | 在 A 的基础上再买个域名 | 再加 20 分钟 | 约 $10–15/年 | `prismlens.org` |
| C | 改你自己 GitHub 账号的名字 | 5 分钟 | 免费 | `prism-lens.github.io/PRISM/` |

**建议：先做 A。** 十分钟、免费、可撤销，做完网址里就没有你了。
以后想更彻底，再在它上面加 B。

**C 不推荐**：改的是你**整个 GitHub 账号**的名字，你名下所有仓库、所有
以前发出去的链接、别人 @ 你的记录全都跟着变。为了一个网站动整个账号，
代价太大。

> **A 我替你做不了。** 建组织必须用你自己的账号登录，我没有你的账号权限。
> 但下面每一步都是点鼠标，我把每个按钮的英文原文都写出来了。

---

# A 路：转到一个免费组织

## A1 — 先想好组织叫什么

这个名字会直接出现在网址里，所以它要跟你没关系，最好跟 PRISM 有关系。
GitHub 上先到先得，想两三个备选：

```
prism-lens        →  prism-lens.github.io/PRISM/
prismdesk         →  prismdesk.github.io/PRISM/
prism-daily       →  prism-daily.github.io/PRISM/
prismwire         →  prismwire.github.io/PRISM/
refracted         →  refracted.github.io/PRISM/
```

写下你的选择：`_______________________`

## A2 — 建组织

1. 打开 <https://github.com>，确认右上角是登录状态。
2. 点右上角**你的头像** → 菜单里选 **Your organizations**。
3. 点绿色按钮 **New organization**。
4. 这一页会让你选套餐 —— 选 **Free**（下面写着 $0）。
5. 填两栏：

   | 栏位 | 填什么 |
   |---|---|
   | **Organization name** | 你在 A1 想好的名字 |
   | **Contact email** | 你的邮箱（**这一栏不公开**，只有 GitHub 用来联系你） |

   > 名字被占了会当场标红，换一个备选就行。

6. 下面问 **This organization belongs to:** —— 选 **My personal account**。
7. 点 **Next**。
8. 下一页让你邀请成员 —— 直接点 **Skip this step**（或 **Complete setup**）。

组织就建好了。

## A3 — 把仓库转过去

1. 打开你的仓库：<https://github.com/mingshenlu0802-lgtm/PRISM>
2. 点上方的 **Settings**（在 Code / Issues / Pull requests 那一排的最右边）。
3. 左边留在 **General**，页面**拉到最底下**，有一块红框叫 **Danger Zone**。
4. 找到 **Transfer ownership** 这一行，点右边的 **Transfer**。
5. 弹窗里：

   | 栏位 | 填什么 |
   |---|---|
   | **New owner** | 你刚建的组织名（会有下拉提示，**点提示选中它**，别只是打字） |
   | 确认框 | 照它的要求打 `mingshenlu0802-lgtm/PRISM` |

6. 点红色的 **I understand, transfer this repository**。

转完页面会自动跳到新地址：`https://github.com/你的组织名/PRISM`。

## A4 — 重新打开 Pages（**别漏这一步**）

转过去之后，**自动发布会暂时停掉**，要重新打开一次：

1. 新仓库 → **Settings** → 左边 **Pages**。
2. **Build and deployment** 下面的 **Source**，选 **GitHub Actions**。
3. 再去左边的 **Actions** → **General**，确认最上面选的是
   **Allow all actions and reusable workflows**，然后 **Save**。
4. 回到仓库上方的 **Actions** 标签页，点最近一次运行，
   右上角 **Re-run all jobs**。

等一两分钟，绿了就好了。新网址是：

```
https://你的组织名.github.io/PRISM/
```

> **仓库名想改成小写？** Settings → General 最上面的 **Repository name**，
> 改成 `prism` 再 **Rename**，网址就变成 `你的组织名.github.io/prism/`。
> 改不改都行，纯粹好看。

## A5 — 网站本身要不要改？

**不用。一个字都不用改。**

网站用的是相对路径和哈希路由，换到哪个网址、哪个子目录都能跑。
发布流程也没用到任何密钥。所以转完之后，我这边继续改代码、继续自动发布，
一切照旧 —— 只是网址前缀换了。

## A6 — 转完之后要做的两件小事

**① 旧链接会失效，重新发一次给朋友。**
`mingshenlu0802-lgtm.github.io/PRISM/` 转完就打不开了
（GitHub 只会跳转**仓库**地址，不会跳转**网站**地址）。
把新网址重新发一遍。

**② 如果你已经连了 Supabase，去把新网址加进白名单。**
Supabase 后台 → **Authentication** → **URL Configuration** →
**Redirect URLs** 里加一条你的新网址，否则邮箱登录的链接点了会跳错地方。

---

# B 路：再买一个自己的域名（最彻底）

做完 A，网址里已经没有你的名字了，但还有 `github.io`。
想连这个也去掉，就买一个自己的域名。

## B1 — 买域名，**记得开隐私保护**

在 <https://www.namecheap.com> 或 <https://porkbun.com> 搜你想要的名字
（`prismlens.org`、`refracted.news` 之类），`.org` 一年大约 $10–15。

> **结账前务必确认 WHOIS privacy / Domain privacy 是打开的**（这两家默认免费送）。
> 不开的话，你注册时填的**姓名、邮箱、电话会被公开在域名数据库里**，
> 谁都查得到 —— 那就白转组织了。

## B2 — 告诉 GitHub 用这个域名

1. 仓库 → **Settings** → **Pages**。
2. **Custom domain** 那一栏填你的域名，点 **Save**。
3. GitHub 会说验证不通过 —— 正常，因为还没配 DNS，继续下一步。

## B3 — 在买域名的地方配 DNS

进域名商后台的 DNS 设置页，加这五条：

| Type | Host / Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `你的组织名.github.io` |

保存。**等 10 分钟到几小时**（DNS 生效有延迟）。

## B4 — 打开 HTTPS

回 GitHub → **Settings** → **Pages**，等 **Custom domain** 旁边出现绿勾，
然后勾上 **Enforce HTTPS**。

## B5 — 跟我说一声

用 Actions 发布的网站，域名设置有时会在下一次发布时被覆盖掉。
**在控制端的 Claude 里跟我说「我的域名是 xxx，帮我固定住」**，
我会在仓库里加一个 `public/CNAME` 文件，以后每次发布都自动带上，不会再掉。

---

# 还有一处会露你的信息：提交记录

仓库的提交历史里有一条 `Create static.yml`，作者写着你的真实 Gmail
（那是你自己在网页上手动加文件时留下的，GitHub 默认会记作者邮箱）。
公开仓库里这条是谁都能看到的。

**三个办法，从省事到彻底：**

**① 先关掉以后的泄漏（30 秒，现在就该做）**

1. GitHub → 头像 → **Settings** → 左边 **Emails**。
2. 勾上 **Keep my email addresses private**。
3. 勾上 **Block command line pushes that expose my email**。

这样**以后**你在网页上做的任何操作都不会再留真实邮箱。
但**已经留下的那一条改不了**。

**② 转组织的时候顺手清掉（推荐）**

不用「转移」，改成「在组织里建一个全新的空仓库，把代码搬过去」——
历史从头开始，那条记录自然就不存在了。
这个要用到几行命令，**你不用自己弄，跟我说一声我来做**，
步骤写在 [DEPLOY.md](DEPLOY.md) 的 Part 2.2。

**③ 把仓库设成私有**

Settings → General → Danger Zone → **Change repository visibility** →
**Make private**。历史就没人看得到了。
> **但注意：免费账号的私有仓库不能用 GitHub Pages。**
> 设私有之前得先把网站搬到别的地方（比如 Cloudflare Pages，也免费），
> 要做的话跟我说。

---

# 常见问题

**转组织会不会把网站弄坏？**
不会。代码、内容、Supabase 里的数据一个都不动。会短暂停一下自动发布，
按 A4 重新打开就行。真出问题也能转回来 —— 转移是可逆的。

**朋友存的旧链接怎么办？**
会打不开，要重发一次新链接。**这是转移唯一的代价。**
所以越早做越好 —— 现在只有你自己在用，等发给一圈人之后再换就麻烦了。

**Supabase 项目 ID 里有没有我的名字？**
没有。`lutztcjcgrqjbpzzbzmw` 是随机生成的，跟你的身份无关。

**做完之后怎么确认真的干净了？**
把新网址整个复制出来，看有没有你的名字；再打开
`https://github.com/你的组织名/prism` 看仓库地址。两处都干净就成了。
