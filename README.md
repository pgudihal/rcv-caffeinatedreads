# Caffeinated Reads RCV

A small ranked-choice voting app for a book club. Admins create ballots, share a public vote link, and members rank books. Results update live after voting.

## Features

- Admin password flow with short-lived signed cookie sessions
- Admin dashboard for managing ballots
- Create, close/reopen, and delete ballots
- Public vote pages with drag-and-drop ranking
- Public results-only pages
- Near-live results through server-side aggregate result polling
- Deterministic random tie-breaks with visible tie-break notes
- Individual vote deletion from the admin ballot page
- Mobile-first layout for voting from phones

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Postgres + Realtime
- Vercel deployment

## Environment

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=generated_secret
```

Generate `ADMIN_SESSION_SECRET` with:

```bash
openssl rand -hex 32
```

`ADMIN_SESSION_SECRET` is optional because the app falls back to `ADMIN_PASSWORD`, but a separate secret is recommended before sharing the app.

## Supabase Setup

Run the migrations in Supabase SQL Editor:

```text
supabase/migrations/20260430000000_initial_book_club_rcv.sql
supabase/migrations/20260430001000_normalize_voter_names.sql
supabase/migrations/20260430002000_remove_public_vote_reads.sql
```

The app intentionally keeps raw vote rows private. Public pages get aggregate RCV rounds and voter counts from Next.js API routes using `SUPABASE_SECRET_KEY`; admin-only pages use protected API routes for raw vote management.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

This project uses Next.js 16, which requires Node.js `>=20.9.0`.

## Scripts

```bash
npm run dev      # start local dev server
npm run lint     # run ESLint
npm test         # run RCV unit tests
npx tsc --noEmit # type-check the app
npm run build    # production build
```

## App Routes

- `/` - public home page and admin login entry
- `/admin` - protected admin dashboard
- `/admin/ballot/:code` - protected ballot management page
- `/create` - protected ballot creation page
- `/vote/:code` - public voting page
- `/results/:code` - public live results page

## Deployment

Vercel works well for free hosting.

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Add the environment variables listed above.
4. Deploy.

Vercel provides a free public URL like:

```text
https://your-project.vercel.app
```

After deployment, test:

- Admin login
- Create ballot
- Public vote link
- Public results link
- Live result updates from another browser/session
- Close/reopen ballot
- Delete test ballot

## Notes

- The database table is named `candidates`, but the UI calls them books.
- One voter creates multiple `votes` rows, one per ranked book.
- Duplicate voters are detected with normalized `voter_name_key`.
- Tie-breaks are deterministic: the app makes a stable random-like choice and displays it in the results.
