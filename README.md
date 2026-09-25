# project

Next.js, deployed to Cloudflare Workers (via [OpenNext](https://opennext.js.org/cloudflare)), backed by [Supabase](https://supabase.com).

First-time setup (accounts, secrets, first deploy): see **[SETUP.md](./SETUP.md)**.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production Next.js build |
| `npm run preview` | Build with OpenNext and run it in a local Cloudflare Workers runtime |
| `npm run deploy` | Build with OpenNext and deploy to Cloudflare Workers |
| `npm run lint` | ESLint |
| `npx supabase db push` | Apply pending migrations in `supabase/migrations/` to the linked Supabase project |

Pushing to `main` runs this automatically via GitHub Actions — see `.github/workflows/deploy.yml`.
