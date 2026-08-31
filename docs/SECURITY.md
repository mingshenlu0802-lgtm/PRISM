# 安全与隐私：完整操作手册

> **要照着一步步做，用 [DEPLOY.md](DEPLOY.md)（英文）。**
> 那份是完整的操作流程，按钮名称跟你在 GitHub / Google Cloud / Cloudflare
> 里看到的英文界面一字不差。这一份讲的是**为什么**——每一步在防什么，
> 以及哪些事其实不用担心。两份配合看最省事。

两件事，分开处理：

- **A. 别人进不了我的控制端**（真正的权限保护）
- **B. 公开的地方不出现我的姓名和账号**（隐私）

先说一句最重要的实话，它决定了 A 该怎么做。

---

## 零、先弄清楚「入侵控制端」到底能造成什么后果

网站是**纯静态**的：没有服务器，没有数据库。所有判断（谁是站长、谁能编辑）
都在访问者自己的浏览器里跑。这意味着：

**懂技术的人可以绕过界面上的判断。** 打开开发者工具，改几个变量，
他就能在**他自己的浏览器里**看到控制端的界面。这一点没有办法在纯静态网站上解决。

但接下来这一点同样重要，而且是好消息：

> **他改不了你发布出去的网站。**
>
> 网站内容要真正更新，必须写回 GitHub，而写回 GitHub 需要你的 **GitHub token**。
> 那串 token 只存在你自己电脑的浏览器里，从来没有进过发布出去的文件。
> 没有它，一个绕进控制端界面的人能做的只有一件事：把**他自己屏幕上的那份副本**
> 改乱。刷新一下就没了，你的网站一个字都不会变。
>
> Claude 的 API key 也是一样：只在你的浏览器里，别人拿不到，也花不了你的钱。

所以现在的状态是：

| 风险 | 现状 |
| --- | --- |
| 别人看到控制端**长什么样** | 有可能（挡不住） |
| 别人**改掉你发布的网站** | 不可能，除非拿到你的 GitHub token |
| 别人**花掉你的 Claude 额度** | 不可能，除非拿到你电脑上的 API key |
| 别人**拿到你的读者数据** | 没有这种数据——网站不收集任何东西 |

如果你能接受「界面可能被人看到，但内容动不了」，**A 部分你可以直接跳到第三节**
（保护 token），那才是真正要守住的东西。

如果你要连界面也进不去，往下看。

---

## A. 让控制端真的进不去

### A1. 最有效的一招：Cloudflare Access（免费，不用写代码）

原理：在网站前面加一道**服务端**的门。访问者还没拿到任何页面文件，
就先被 Cloudflare 要求验证身份。这不是界面上的判断，是真正的拦截。

免费额度 50 个用户，对你完全够用。

**做之前需要两个前提：**

1. 你有一个**自己的域名**（见 B2，约 ¥80–150/年）。
   Cloudflare 必须接管域名的 DNS 才能挡在前面，`*.github.io` 做不到。
2. 控制端要有一个**真实路径**，比如 `站点/console/`。
   现在的地址是 `站点/#/console`——`#` 后面的部分**浏览器不会发给服务器**，
   所以 Cloudflare 看不见它，也就没法只保护它。

> 第 2 点需要改代码：把控制端拆成一个独立的入口页。
> 这是一次性的改动，跟我说一声就能做（在控制端的 Claude 里说
> 「把控制端拆成独立页面，好让 Cloudflare Access 能保护它」即可）。
> 在那之前，Cloudflare Access 只能保护**整个网站**——那样读者也进不来了，
> 对一个公开媒体站不合适。

**具体步骤（域名和独立路径都就绪之后）：**

1. 注册 [cloudflare.com](https://cloudflare.com)，Add a site，输入你的域名。
2. Cloudflare 会给你两个 nameserver 地址。回到你买域名的地方，
   把域名的 nameserver 改成这两个。等待生效（几分钟到几小时）。
3. 在 Cloudflare 的 DNS 页面，加四条 A 记录指向 GitHub Pages：
   `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`，
   Proxy status 全部设为 **Proxied**（橙色云朵）。
4. 左侧 **Zero Trust** → 第一次进要建一个 team（名字随便）→ 选 **Free** 方案。
5. **Access → Applications → Add an application → Self-hosted**。
   - Application name：`PRISM 控制端`
   - Session Duration：`24 hours`
   - Application domain：域名 `你的域名`，path 填 `console`
6. 下一步 **Add policy**：
   - Policy name：`只有我`
   - Action：**Allow**
   - Include → **Emails** → 填你的 Gmail 地址
   - （要加管理员，就在这里多填几个地址）
7. Save。

做完之后，任何人打开 `你的域名/console/` 都会先看到 Cloudflare 的登录页，
邮箱不在名单上的**连页面文件都下载不到**。这是真正的服务端保护。

### A2. 更彻底：仓库设为私有

现在仓库是公开的，任何人都能读到源码（源码里没有你的地址了，见 B1，
但逻辑是公开的）。设为私有之后，连源码都看不到。

- GitHub Pages 从**私有仓库**发布需要 GitHub Pro（约 $4/月）。
- 或者改用 **Cloudflare Pages**：私有仓库也能免费发布，而且天然跟上面的
  Access 是同一套后台。做法：Cloudflare → Workers & Pages → Create →
  Pages → Connect to Git → 选你的仓库 → Build command 填 `npm run build`，
  Build output directory 填 `dist`。

> 提醒一句：设为私有能挡住「读源码」，但挡不住 A1 要挡的东西。
> 发布出去的网站文件永远是公开可下载的——这是所有网站的共同点。
> **真正的门是 A1，不是私有仓库。**

### A3. 无论如何都要做的三件小事

1. **别在公用电脑或别人的电脑上登录控制端。** token 和 API key 都存在浏览器里，
   这是最现实的泄露途径，比任何「黑客入侵」都常见得多。
2. **给 GitHub token 设过期时间。** 建 token 时选 90 天，到期换一个。
   万一泄露，影响有个尽头。
3. **token 只勾最小权限。** Contents 的写权限（同步内容用）+ Issues 的写权限
   （开 issue 用）。不要勾 admin、不要勾 delete_repo、不要用 classic token 的全选。

---

## B. 公开的地方不出现你的姓名和账号

### B1. 已经处理好的：网站文件里没有你的邮箱

**这一条我已经改好了，不用你做。**

之前你的邮箱地址是写死在源码里的，会被打包进每个读者都会下载的 JS 文件——
一个每天更新的公开网站，是爬虫最省事的邮箱来源。

现在代码里只有邮箱的 **SHA-256 哈希**（一串 64 位十六进制）。
你登录时，浏览器把你的邮箱算一遍哈希跟它比对；地址本身只留在你自己的浏览器里，
从不发布。GitHub 用户名也从代码里拿掉了，改成你在控制端里填。

发布流程里加了一道自动检查（`npm run privacy`）：
**只要发布产物里出现任何邮箱地址，就不发布。** 这条防线不依赖谁记得住。

> 换站长或换邮箱怎么办？在这个仓库里跑一句：
> ```bash
> node -e "console.log(require('crypto').createHash('sha256').update('新地址@gmail.com').digest('hex'))"
> ```
> 把结果填进 `src/lib/owner.ts` 的 `OWNER_HASH`，推送即可。
>
> 哈希做到了什么、没做到什么，说清楚：它挡住的是**顺手扫走**。
> 一个已经知道你是谁的人，可以自己算哈希来验证猜测——它不是密码。
> 要防的是爬虫，不是针对性追查。

### B2. 网址里不要出现你的账号名

GitHub Pages 默认给的是 `你的账号名.github.io/仓库名/`，账号名里带姓名就露了。

| 办法 | 网址变成 | 花费 | 说明 |
| --- | --- | --- | --- |
| **建组织**，把仓库转过去 | `prismlens.github.io/PRISM/` | 免费 | 最快，立刻解决露名 |
| 改个人账号名 | `新名字.github.io/PRISM/` | 免费 | 会断掉你名下所有仓库的旧链接 |
| **买自己的域名** | `prismlens.org` | ¥80–150/年 | 最干净，也是 A1 的前提 |

**推荐：先建组织（免费、立刻见效），确定要长期做再买域名。** 两者不冲突。

**建组织：**
1. GitHub 右上角头像 → **Your organizations** → **New organization** → 选 **Free**。
2. 组织名起一个跟站点有关的，比如 `prism-lens`、`prismdaily`——
   **不要包含你的姓名或常用 ID**。
3. 回到仓库 → Settings → 最下面 **Transfer ownership** → 转给这个组织。
4. 转完之后 Pages 要重新开一次：Settings → Pages → Source 选 GitHub Actions。
5. 回 Google 那边，把新网址加进「已获授权的 JavaScript 来源」，
   否则登录会报 `origin_mismatch`。

**买自己的域名：**
1. 在任意域名商买下域名。**买的时候一定要勾上 WHOIS 隐私保护 / Domain Privacy**
   （多数域名商免费提供）。不勾的话，你的**姓名、地址、电话、邮箱会进入公开的
   WHOIS 数据库，全世界可查**——这是最容易被忽略、后果最直接的一处泄露。
2. DNS 加四条 A 记录指向 `185.199.108.153`、`185.199.109.153`、
   `185.199.110.153`、`185.199.111.153`；再加一条 `www` 的 CNAME 指向
   `你的组织名.github.io`。
3. 仓库里新建文件 `public/CNAME`，内容一行，就是你的域名。
   （用 Actions 发布时，域名必须写在 `public/CNAME` 里才会被打包进去。）
4. 仓库 Settings → Pages → Custom domain 填同一个域名 → 勾 **Enforce HTTPS**。

### B3. Git 提交记录里的邮箱

每一次 git 提交都带作者邮箱，**仓库公开的话这是公开可查的**。

**以后的提交不再泄露：**
1. GitHub → Settings → Emails → 勾上
   **Keep my email addresses private** 和 **Block command line pushes that expose my email**。
2. 同一页面会给你一个 `12345678+你的用户名@users.noreply.github.com`，复制它。
3. 在电脑上跑：
   ```bash
   git config --global user.email "12345678+你的用户名@users.noreply.github.com"
   ```
4. 在网页上（GitHub 网页版、Claude Code on the web）改文件时，
   GitHub 会自动用 noreply 地址，不用管。

**已经推上去的历史怎么办？**
改写历史会让所有已有的链接和 fork 失效，而且要强制推送。对这个仓库，
更省事也更彻底的做法是：**建一个新仓库，只推当前这一份代码**（不带历史）。

```bash
# 在项目目录里
rm -rf .git
git init
git config user.email "12345678+你的用户名@users.noreply.github.com"
git add -A
git commit -m "PRISM"
git remote add origin https://github.com/你的组织名/PRISM.git
git push -u origin main
```

旧仓库设为私有或删掉。**做之前先确认新仓库里东西是全的。**

### B4. Google 那边会露什么

你在申请客户端 ID 时填的**应用名称**和**用户支持邮箱**，
会显示在别人点「用 Google 登录」时弹出的授权窗口里。

- **应用名称**：填站点名（`PRISM 棱镜`），不要填你的名字。
- **用户支持邮箱**：Google 要求必须是一个真实邮箱，而且**会显示给登录的人看**。
  想避免露出主邮箱，就**单独注册一个 Gmail 专门做这个站**
  （比如 `prismlens.desk@gmail.com`），用它当站长账号和支持邮箱。
  这是最干净的做法，顺便也让 B1 的哈希跟你的私人身份彻底脱钩。

### B5. 一份检查清单

发布之前逐条过一遍：

- [ ] 网址里没有姓名（组织名或自有域名）
- [ ] 买域名时勾了 WHOIS 隐私保护
- [ ] GitHub 开了 Keep my email addresses private
- [ ] `git config user.email` 已改成 noreply 地址
- [ ] 提交历史里没有真实邮箱（或已用新仓库重来）
- [ ] Google 应用名称是站点名，不是人名
- [ ] Google 支持邮箱是专用邮箱，不是私人主邮箱
- [ ] `npm run privacy` 通过（发布流程会自动跑）
- [ ] 网站文案里没有你的名字（About 页、页脚自己看一眼）

---

## 一句话总结

**先做 B（隐私），它便宜、快、而且不做的话覆水难收。**

A（真正的门禁）要看你在意到什么程度：现在的状态是「界面可能被看到，
但内容动不了、钱花不了、数据没有」。如果这够用，把精力放在守好 GitHub token 上
（A3 那三条）。如果不够，走 A1 的 Cloudflare Access —— 那是唯一真正有效的办法，
需要一个自己的域名，加上把控制端拆成独立路径的那一次代码改动。
