# Setup checklist

This project is a Next.js app scaffolded to run on **Cloudflare Workers**
(via the OpenNext adapter) with **Supabase** for auth/database, deployed
automatically from **GitHub Actions** on every push to `main`.

Everything in the repo is done. What's left are account-side steps only you
can do (creating accounts, generating tokens, naming the project).

## 1. Rename the project

The scaffold uses the placeholder name `project` in three places. Pick a
real name and update:
- `package.json` → `"name"`
- `wrangler.jsonc` → `"name"` and the `services[0].service` binding
- `supabase/config.toml` → `project_id`

## 2. Push to GitHub

```bash
cd project
git add -A
git commit -m "Initial scaffold"
gh repo create YOUR-ORG/YOUR-REPO --private --source=. --remote=origin --push
```

(No `gh`? Create the repo on github.com, then `git remote add origin <url> && git push -u origin main`.)

## 3. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Note the **Project Reference ID** (Settings → General) and set a
   database password — you'll need both shortly.
3. Settings → API → copy the **Project URL** and **anon public** key.
4. Create `.env.local` in the project root from the template and paste
   them in:
   ```bash
   cp .env.example .env.local
   ```
5. Install the Supabase CLI locally and apply the starter migration
   (creates a `notes` table used by the home page):
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   ```
6. `npm run dev` and open http://localhost:3000 — you should see "Hello
   from Supabase 👋" under **Notes from Supabase**.

## 4. Create the Cloudflare account/site

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) if you
   don't have an account.
2. Note your **Account ID** (right sidebar of any domain overview page, or
   `npx wrangler whoami` after logging in locally).
3. Create an API token: **My Profile → API Tokens → Create Token → Edit
   Cloudflare Workers** template. Scope it to your account. Save the token
   value — it's shown once.
4. (Optional, do this now if you're pointing a real domain at the app)
   Add your domain to Cloudflare and update its nameservers. Not required
   to deploy — every Worker gets a free `*.workers.dev` URL.

## 5. Add repository secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token from step 4.3 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from step 4.2 |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 3.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from step 3.3 |
| `SUPABASE_ACCESS_TOKEN` | Generate at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password from step 3.2 |
| `SUPABASE_PROJECT_ID` | Project reference ID from step 3.2 |

## 6. First deploy

Push to `main` (or merge a PR into it). The `Deploy` workflow will:
1. Apply any new files in `supabase/migrations/` to the live database.
2. Build the app with OpenNext and deploy it to Cloudflare Workers.

Watch it run under the repo's **Actions** tab. On success, Cloudflare
prints the live URL (`https://YOUR-PROJECT.YOUR-SUBDOMAIN.workers.dev`) in
the job log.

You can also deploy manually from your machine at any point:
```bash
npm run deploy
```
(reads `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` from the environment,
or falls back to an interactive `wrangler login`.)

## 7. Runtime environment variables on the Worker itself

The Supabase URL/anon key above are baked into the client bundle at build
time, but server-rendered pages read them from `process.env` at request
time too, so the deployed **Worker** also needs them. Since the anon key
is meant to be public (it's already shipped to the browser), the simplest
option is to add them directly to `wrangler.jsonc`:

```jsonc
"vars": {
  "NEXT_PUBLIC_SUPABASE_URL": "https://YOUR-PROJECT-REF.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-public-key"
}
```

Commit that (these values are not secret). If you later add real secrets
(a service-role key, a third-party API key), use
`npx wrangler secret put SECRET_NAME` instead — those never go in the repo.

## What's already wired up

- `src/lib/supabase/{client,server,middleware}.ts` — Supabase clients for
  the browser, Server Components, and session refresh.
- `src/proxy.ts` — refreshes the auth session on every request;
  redirects unauthenticated visitors away from `/account/*` (edit the
  matcher to fit your routes).
- `src/app/login` + `src/app/auth/confirm` — a working magic-link sign-in
  flow.
- `supabase/migrations/` — schema as code; `supabase db push` applies it,
  and the Deploy workflow does this automatically on every push to `main`.
- `wrangler.jsonc` + `open-next.config.ts` — Cloudflare Worker config via
  the OpenNext adapter.
- `.github/workflows/ci.yml` — lint + build on every PR.
- `.github/workflows/deploy.yml` — migrate DB, then build + deploy to
  Cloudflare, on every push to `main`.

## Local development

```bash
npm install
npm run dev          # Next.js dev server at localhost:3000
npm run preview      # build with OpenNext and run it in a local Worker runtime
npm run deploy        # build and deploy to Cloudflare
npx supabase db push  # apply new migrations to the linked Supabase project
```
