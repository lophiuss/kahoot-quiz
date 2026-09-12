# 教会与教堂的团体结构 · Kahoot 互动答题游戏

A real-time, Kahoot-style multiplayer quiz built with Next.js + Supabase (Postgres + Realtime), deployable to Vercel.

- **Host a game** at `/` → get a PIN + QR code, players join at `/play/<pin>` from their own phones.
- Host controls pacing (start, reveal, next); every player's screen updates live via Supabase Realtime.
- Scoring (base points + speed bonus + streak bonus) and answer correctness are computed **server-side** in the API routes, so a player's browser never sees the correct answer or controls their own score.
- Multiple game rooms can run at the same time — each has its own PIN and is fully isolated.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind)
- Supabase: Postgres tables (`games`, `players`, `answers`) + Realtime
- Deployed on Vercel

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL, anon key, and service role key (Settings → API in the Supabase dashboard).
3. Run the schema once in that project's SQL Editor: [`supabase/schema.sql`](./supabase/schema.sql).
4. `npm run dev`

## Deploying to Vercel

1. Import this repo into Vercel.
2. Add the same three environment variables from `.env.local` in the Vercel project settings (Production + Preview).
3. Deploy. No other config needed — the API routes run as Vercel serverless functions.

## Project structure

- `app/page.tsx` — landing page (host or join)
- `app/host/[pin]/page.tsx` — host control screen (lobby → question → reveal → podium)
- `app/play/[pin]/page.tsx` — player screen
- `app/api/games/**` — server routes: create game, join, start, submit answer, reveal, next question
- `lib/questions.server.ts` — full question bank incl. correct answers (server-only, never bundled to the client)
- `lib/questions.client.ts` — question text/options only, safe for the browser bundle
- `reference/original-single-device.html` — the original single-device, no-backend version this was built from

## Original single-device version

`reference/original-single-device.html` is the original single-page, client-only quiz this project was built from (host mode there was decorative — it didn't actually sync anything). Kept for reference.
