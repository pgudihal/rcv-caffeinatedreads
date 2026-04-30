-- Book club RCV app schema.
--
-- This migration captures the current Supabase shape the Next.js app expects.
-- Server-side admin/vote API routes use SUPABASE_SECRET_KEY for writes.
-- Public clients use the publishable key for reading ballots, candidates, and
-- votes/results.

create extension if not exists pgcrypto;

create table if not exists public.ballots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  share_code text not null unique default lower(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.ballots(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.ballots(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  rank integer not null check (rank > 0),
  voter_name text not null,
  voter_name_key text generated always as (lower(regexp_replace(btrim(voter_name), '\s+', ' ', 'g'))) stored,
  created_at timestamptz not null default now(),
  constraint one_rank_per_candidate_per_voter unique (ballot_id, voter_name_key, candidate_id),
  constraint one_candidate_per_rank_per_voter unique (ballot_id, voter_name_key, rank)
);

create index if not exists candidates_ballot_id_idx on public.candidates(ballot_id);
create index if not exists votes_ballot_id_idx on public.votes(ballot_id);
create index if not exists votes_ballot_voter_name_idx on public.votes(ballot_id, voter_name);
create index if not exists votes_ballot_voter_name_key_idx on public.votes(ballot_id, voter_name_key);

alter table public.votes drop constraint if exists one_vote_per_name;
alter table public.votes add column if not exists voter_name_key text
  generated always as (lower(regexp_replace(btrim(voter_name), '\s+', ' ', 'g'))) stored;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_rank_per_candidate_per_voter'
      and conrelid = 'public.votes'::regclass
  ) then
    alter table public.votes
      add constraint one_rank_per_candidate_per_voter
      unique (ballot_id, voter_name_key, candidate_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'one_candidate_per_rank_per_voter'
      and conrelid = 'public.votes'::regclass
  ) then
    alter table public.votes
      add constraint one_candidate_per_rank_per_voter
      unique (ballot_id, voter_name_key, rank);
  end if;
end $$;

alter table public.ballots enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

drop policy if exists "Public can read ballots" on public.ballots;
create policy "Public can read ballots"
on public.ballots
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read candidates" on public.candidates;
create policy "Public can read candidates"
on public.candidates
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read votes" on public.votes;
create policy "Public can read votes"
on public.votes
for select
to anon, authenticated
using (true);

-- Intentionally no public insert/update/delete policies. Mutations go through
-- protected Next.js API routes using SUPABASE_SECRET_KEY.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;
