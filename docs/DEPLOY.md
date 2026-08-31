# PRISM — Deployment, Hardening and De-personalisation

A complete runbook. Follow it top to bottom the first time. Every button name
below is the exact English label you will see in GitHub, Google Cloud and
Cloudflare.

**Goal:** the site is published, nothing public carries your name or personal
account, and the console is protected by a real server-side check rather than
a check that runs in the visitor's own browser.

**Time:** about 2 hours end to end. Parts 1–4 (about 45 minutes) get you
published and de-personalised. Part 5 (the real lock) needs a domain and can
be done later.

---

## Part 0 — What you are actually protecting

Be clear about this before spending effort in the wrong place.

The site is **static**. There is no server and no database. Everything the
console decides — who is the owner, who may edit — is decided by JavaScript
running in the visitor's own browser. Anyone who knows how can bypass that and
see the console interface.

**But they cannot change your published site.** Publishing requires either a
push to GitHub or your **GitHub token**, and that token exists only in your own
browser's storage. It has never been part of any published file. Someone who
forces their way into the console UI is editing *their own screen*. They
refresh, and it is gone. Your site never changed.

| Risk | Reality |
| --- | --- |
| Someone sees what the console looks like | Possible. Cannot be prevented on a static site (Part 5 fixes it) |
| Someone changes your published site | **Not possible** without your GitHub token |
| Someone spends your Claude credit | **Not possible** without the API key on your machine |
| Someone steals reader data | There is none. The site collects nothing |

So the ranking is: **de-personalise first** (Parts 1–4, cheap and irreversible
if skipped), **guard your token** (Part 6), and add the real lock (Part 5) when
you want it.

---

## Part 1 — Create the de-personalised identities

Do this before anything else. Everything later refers back to these names.

### 1.1 Pick your public names

Nothing public should contain your real name or your usual handle. Pick from
the site's own vocabulary. Some that are usually available:

| What | Suggestions |
| --- | --- |
| GitHub organisation | `prism-lens`, `prismdesk`, `prism-daily`, `prismwire`, `refracted` |
| Repository | `prism` or `site` |
| Gmail account | `prismlens.desk@gmail.com`, `prism.daily.desk@gmail.com` |
| Domain (later) | `prismlens.org`, `prism-daily.org`, `refracted.news` |

Write your three choices down now:

```
Organisation: ______________________
Gmail:        ______________________
Domain:       ______________________  (can be decided later)
```

### 1.2 Create a dedicated Gmail account

**This is the single most important step for de-personalisation**, because
Google will display this address publicly on the sign-in consent screen, and it
becomes your owner account.

1. Go to <https://accounts.google.com/signup>.
2. First name: `PRISM`. Last name: `Desk` (or leave blank).
3. Username: the address you chose above.
4. When asked for a recovery phone or email, you may add your personal one —
   **recovery details are private and never displayed to visitors.**

From now on, **this account is the site owner**. Your personal Gmail should
never appear anywhere in this project.

### 1.3 Create the GitHub organisation

1. Sign in to GitHub. Click your avatar (top right) → **Your organizations**.
2. Click **New organization** → choose the **Free** plan.
3. **Organization account name:** the name you chose.
4. **Contact email:** your new PRISM Gmail, **not** your personal address.
5. When it asks to add members, click **Skip this step**.

### 1.4 Turn on GitHub email privacy

This stops your address leaking through commit metadata.

1. GitHub → avatar → **Settings** → **Emails** (left sidebar).
2. Tick **Keep my email addresses private**.
3. Tick **Block command line pushes that expose my email**.
4. Just above those checkboxes, GitHub shows an address like
   `12345678+yourname@users.noreply.github.com`. **Copy it.**
5. On your computer, in a terminal:

```bash
git config --global user.email "12345678+yourname@users.noreply.github.com"
git config --global user.name "PRISM Desk"
```

---

## Part 2 — Move the code into the organisation

Your current repository history contains commits authored with your personal
email. Rewriting that history is fiddly and error-prone. Starting a clean
repository under the organisation is faster and removes the problem entirely.

### 2.1 Create the new repository

1. Go to your organisation's page → **New repository**.
2. **Repository name:** `prism`.
3. **Public** (keep it public for now; Part 5.4 covers going private).
4. Do **not** tick "Add a README file".
5. Click **Create repository**.

### 2.2 Push the current code with no history

On your computer, in the project folder:

```bash
# Make sure you are in the right folder — this should list src/ and package.json
ls

# Take a backup first, in case something goes wrong
cd .. && cp -r PRISM PRISM-backup && cd PRISM

# Drop the old history and start clean
rm -rf .git
git init -b main
git config user.email "12345678+yourname@users.noreply.github.com"
git config user.name "PRISM Desk"
git add -A
git commit -m "PRISM"
git remote add origin https://github.com/YOUR-ORG/prism.git
git push -u origin main
```

Replace `YOUR-ORG` with your organisation name and the email with the noreply
address you copied.

### 2.3 Verify nothing personal came along

```bash
git log --format='%an <%ae>'     # should show only "PRISM Desk <...noreply...>"
grep -ri "your-personal-handle" . --exclude-dir=node_modules --exclude-dir=.git
grep -ri "your.personal@gmail.com" . --exclude-dir=node_modules --exclude-dir=.git
```

The last two should print nothing.

### 2.4 Archive the old repository

Go to the old repository → **Settings** → scroll to **Danger Zone** →
**Change repository visibility** → **Make private**. (Or **Delete this
repository** once you are sure the new one works.)

---

## Part 3 — Set the owner account in the code

The site never stores your email address in any published file. It stores a
**SHA-256 hash** of it, and compares that at sign-in. You need to replace the
hash with one for your new PRISM Gmail.

1. In the project folder, run this with your new address:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('prismlens.desk@gmail.com').digest('hex'))"
```

2. Copy the 64-character result.
3. Open `src/lib/owner.ts` and replace the value of `OWNER_HASH` with it.
4. Commit and push:

```bash
git add src/lib/owner.ts
git commit -m "Set the owner account"
git push
```

> **What the hash does and does not do.** It keeps every email address out of
> the files the public downloads, which is what stops automated scraping. It is
> not a password: someone who already knows which account runs the site could
> hash a guess and confirm it. The real access control is Part 5.

---

## Part 4 — Publish

### 4.1 Enable GitHub Pages

1. New repository → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

That is all. The repository already contains the workflow.

### 4.2 Point the workflow at `main`

Open `.github/workflows/pages.yml` and make sure the `branches:` list contains
`main`. Commit and push. Every push to `main` now rebuilds and republishes.

Before publishing, the workflow runs:

- `npm run check` — types, data integrity, 42 behaviour tests
- `npm run privacy` — **fails the deploy if any email address appears in the
  built files**

A failing check means nothing is published. A broken page cannot reach your
readers.

### 4.3 Watch the first deploy

Repository → **Actions** tab → the running job. When the `deploy` job turns
green, click it: the URL is shown as the environment link. It will be
`https://YOUR-ORG.github.io/prism/`.

Open it. No part of that URL is your name.

---

## Part 5 — Real protection for the console

Everything so far leaves the console guarded only by browser-side logic. This
part adds a check that happens **before any file is served**.

### 5.1 Buy a domain — with privacy on

Cloudflare has to control your DNS to sit in front of the site, and it cannot
do that for a `*.github.io` address.

1. Buy your chosen domain at any registrar (Namecheap, Cloudflare Registrar,
   Porkbun are all fine).
2. **Tick WHOIS Privacy / Domain Privacy Protection during checkout.** Most
   registrars include it free.

> **Do not skip this.** Without it, your **name, postal address, phone number
> and email go into the public WHOIS database**, which anyone can query in one
> command. This is the single most damaging privacy leak in the whole process,
> and the easiest to avoid.

3. At the registrar, set the domain's **contact email** to your PRISM Gmail.

### 5.2 Point the domain at the site

1. In the repository, create a file at `public/CNAME` containing exactly one
   line — your domain, with no `https://` and no trailing slash:

```
prismlens.org
```

2. Commit and push.
3. At your DNS provider, add four **A** records for the root (`@`):
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
4. Add one **CNAME** record: name `www`, value `YOUR-ORG.github.io`.
5. Repository → **Settings** → **Pages** → **Custom domain** → enter the domain
   → **Save**. Wait for the check to pass, then tick **Enforce HTTPS**.

### 5.3 Put Cloudflare Access in front of the console

Cloudflare's free plan covers 50 users.

1. Sign up at <https://cloudflare.com> **with your PRISM Gmail**.
2. **Add a site** → enter your domain → choose the **Free** plan.
3. Cloudflare gives you two nameservers. Go to your registrar and replace the
   domain's nameservers with those two. Wait for Cloudflare to confirm
   (minutes to a few hours).
4. In Cloudflare → **DNS**, make sure the four A records from 5.2 are there and
   that **Proxy status** shows **Proxied** (orange cloud) for each.
5. Left sidebar → **Zero Trust**. First time, it asks for a team name — use a
   PRISM name — and a plan: choose **Free**.
6. **Access** → **Applications** → **Add an application** → **Self-hosted**.
   - **Application name:** `PRISM console`
   - **Session Duration:** `24 hours`
   - **Application domain:** subdomain blank, domain `prismlens.org`,
     **path** `console`
7. **Next** → **Add policy**:
   - **Policy name:** `Owner and editors`
   - **Action:** **Allow**
   - **Configure rules** → Include → selector **Emails** → value: your PRISM
     Gmail. Add one row per additional editor.
8. **Next** → **Add application**.

Now `prismlens.org/console` is stopped at Cloudflare's edge. A visitor who is
not on that email list **cannot download the page at all**. This is real
access control.

> **One prerequisite.** The console currently lives at `#/console`. Everything
> after `#` stays in the browser and is never sent to the server, so Cloudflare
> cannot see it. The console has to be moved to a real path (`/console/`)
> before rule 6 can match. This is a one-time code change — ask for it in the
> console's Claude tab: *"把控制端拆成独立页面，好让 Cloudflare Access 能保护它"*.
> Until then, step 6's path rule will not match anything, and you should leave
> Part 5.3 for later rather than protecting the whole site (which would lock
> your readers out too).

### 5.4 Optional: make the repository private

This hides the source code. It does not hide the published site — no site can
do that — but it removes one avenue of inspection.

- GitHub Pages from a private repository requires **GitHub Pro** (~$4/month).
- Or host on **Cloudflare Pages**, which builds from private repositories for
  free: Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect
  to Git** → select the repository → **Build command:** `npm run build`,
  **Build output directory:** `dist`.

---

## Part 6 — Token hygiene

These matter more day to day than anything above.

1. **Never sign in to the console on a shared or borrowed computer.** Your
   GitHub token and Claude API key live in the browser. This is the realistic
   way they leak — far more likely than any attack.
2. **Give the GitHub token an expiry.** GitHub → **Settings** → **Developer
   settings** → **Personal access tokens** → **Fine-grained tokens** →
   **Generate new token**. Set **Expiration** to 90 days.
3. **Grant the minimum.** Under **Repository access**, choose **Only select
   repositories** and pick `prism`. Under **Permissions** → **Repository
   permissions**, set only:
   - **Contents:** Read and write (used to save site content)
   - **Issues:** Read and write (used to file code-change requests)

   Leave everything else at **No access**.
4. **If a token ever leaks**, delete it on that same page. It stops working
   immediately.

---

## Part 7 — Google sign-in

Do this **after** the domain is final, because the authorised origin must match
exactly.

Google splits this across three pages under **Google Auth Platform**, and they
must be done **in order**. Going straight to Clients gives you *"Your app's
OAuth configuration is incomplete… visit the Branding page"*.

1. <https://console.cloud.google.com> → project dropdown at the top →
   **New Project**. Name it `PRISM`. → **Create**.
2. Left menu → **Google Auth Platform** → **Branding**. Fill in only:
   - **App name:** `PRISM` — *this is shown to everyone who signs in, so it
     must not contain your name.* (It also may not contain the word "Google".)
   - **User support email:** your PRISM Gmail — **also shown to everyone**.
   - **Developer contact information:** your PRISM Gmail.

   **Leave App logo, Application home page, Privacy policy link and Terms of
   service link empty.** Filling any URL makes Google demand Authorized domains
   and domain-ownership verification — two extra steps that sign-in never
   needs.

   → **Save**.
3. **Audience** → **User type: External** → then **Publish app** →
   **Confirm**.

   > Skipping this leaves the app in *Testing*, where **only accounts you add
   > manually to a test-user list can sign in**. Since this site is meant to
   > let anyone sign in, that would break it. Publishing is instant here — the
   > site requests only name, email and avatar, which are non-sensitive scopes
   > requiring no Google review.
4. **Clients** → **Create client**:
   - **Application type:** **Web application**
   - **Name:** `PRISM web`
   - **Authorised JavaScript origins** → **Add URI** → your site's origin,
     **scheme and domain only**:
     `https://prismlens.org`
     (No path, no trailing slash. If you have not set up a domain yet, use
     `https://YOUR-ORG.github.io`.) Add `http://localhost:5173` too if you want
     to test locally.
   - **Authorised redirect URIs:** leave empty.
   - → **Create**.
5. A dialog shows **Client ID** (ending `.apps.googleusercontent.com`) and
   **Client secret**.
   - **Copy the Client ID.**
   - **Ignore the Client secret. Never paste it into the site or the
     repository.** Nothing here uses it.
6. Open your site → account menu (top right) → **进入控制端** →
   **编辑** → **账号与同步** → expand the Google section → paste the Client ID.

The sign-in button now appears on the public site, and the console changes from
"open to everyone" to owner and admins only.

> If sign-in fails with **`origin_mismatch`**, the origin in step 4 does not
> exactly match the address in your browser's URL bar. Check for a trailing
> slash, a path, `http` vs `https`, or `www.`

---

## Part 8 — Final checklist

Public surfaces:

- [ ] Site URL contains no personal name (`YOUR-ORG.github.io` or your domain)
- [ ] GitHub organisation name is PRISM-related
- [ ] Repository name is `prism`, not something personal
- [ ] Domain registered with **WHOIS privacy enabled**
- [ ] Domain contact email is the PRISM Gmail
- [ ] Google **App name** is `PRISM`
- [ ] Google **User support email** is the PRISM Gmail
- [ ] Cloudflare account registered with the PRISM Gmail

Code and history:

- [ ] `git log --format='%ae'` shows only a `noreply` address
- [ ] `OWNER_HASH` in `src/lib/owner.ts` is the hash of the PRISM Gmail
- [ ] `npm run privacy` passes
- [ ] Old repository archived or deleted
- [ ] Site's own copy (About page, footer) contains no personal name

Access:

- [ ] GitHub token is fine-grained, 90-day expiry, Contents + Issues only
- [ ] Console never opened on a shared computer
- [ ] Cloudflare Access policy created (once the console has its own path)

---

## Part 9 — Publishing changes after launch

**Content, wording, appearance** — one sentence, no deployment:
open the console → **编辑** → **Claude** → say what you want. It changes
immediately, it is logged, and it can be undone.

**Code changes** — new sections, new pages, layout, features:

1. Ask in the console's Claude tab. It will recognise that the request needs a
   code change and write a full brief.
2. Click **开成 GitHub issue**.
3. Click **在 Claude Code 里打开仓库** and say: *"do issue #12"*.
4. It edits, commits and pushes. GitHub Actions rebuilds and republishes
   automatically — usually one to two minutes.

Step 3 cannot be removed: a browser cannot edit source, run a build, or deploy.
What the console can do is make the handover take one sentence.
