-- Normalize voter names for duplicate detection.
--
-- A single voter creates multiple vote rows, one per ranked book. The app uses
-- voter_name for display and voter_name_key for duplicate checks/constraints.

alter table public.votes drop constraint if exists one_vote_per_name;
alter table public.votes drop constraint if exists one_rank_per_candidate_per_voter;
alter table public.votes drop constraint if exists one_candidate_per_rank_per_voter;

alter table public.votes add column if not exists voter_name_key text
  generated always as (lower(regexp_replace(btrim(voter_name), '\s+', ' ', 'g'))) stored;

alter table public.votes
  alter column voter_name set not null;

create index if not exists votes_ballot_voter_name_key_idx
on public.votes(ballot_id, voter_name_key);

alter table public.votes
  add constraint one_rank_per_candidate_per_voter
  unique (ballot_id, voter_name_key, candidate_id);

alter table public.votes
  add constraint one_candidate_per_rank_per_voter
  unique (ballot_id, voter_name_key, rank);
