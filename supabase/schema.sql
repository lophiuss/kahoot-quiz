-- Kahoot-style quiz: run this once in the Supabase SQL Editor for this project
-- https://supabase.com/dashboard/project/xrdtkicczwwvvmqydyza/sql/new

create extension if not exists pgcrypto;

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  pin text unique not null,
  status text not null default 'lobby' check (status in ('lobby','question','reveal','podium')),
  current_question int not null default 0,
  question_started_at timestamptz,
  question_seconds int not null default 20,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  score int not null default 0,
  streak int not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  question_index int not null,
  selected_index int,
  is_correct boolean not null default false,
  points int not null default 0,
  answered_at timestamptz not null default now(),
  unique (player_id, question_index)
);

alter table games enable row level security;
alter table players enable row level security;
alter table answers enable row level security;

-- Public read access: this is a PIN-gated classroom quiz with no sensitive
-- data, so clients read game/player/answer state directly via the anon key
-- and Realtime. All writes go through server route handlers using the
-- service role key, so there are no public insert/update/delete policies.
drop policy if exists "public read games" on games;
create policy "public read games" on games for select using (true);

drop policy if exists "public read players" on players;
create policy "public read players" on players for select using (true);

drop policy if exists "public read answers" on answers;
create policy "public read answers" on answers for select using (true);

-- Enable Realtime so hosts/players see live updates without polling.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
