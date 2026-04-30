import 'server-only'

import { runRCV, type RoundResult } from '@/lib/rcv'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { voterNameKey } from '@/lib/voter-name'

export type PublicResults = {
  ballot: {
    id: string
    title: string
    share_code: string
    is_open: boolean
  }
  candidates: {
    id: string
    title: string
  }[]
  rounds: RoundResult[]
  voteCount: number
}

type VoteRow = {
  candidate_id: string
  rank: number
  voter_name: string | null
  voter_name_key: string | null
}

export async function getPublicResultsByCode(code: string) {
  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .select('id, title, share_code, is_open')
    .eq('share_code', code)
    .maybeSingle()

  if (ballotError) {
    console.error('Public result ballot lookup error:', ballotError)
    return { error: 'Failed to load ballot', status: 500 as const }
  }

  if (!ballot) {
    return { error: 'Ballot not found', status: 404 as const }
  }

  const { data: candidates, error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .select('id, title')
    .eq('ballot_id', ballot.id)

  if (candidatesError) {
    console.error('Public result candidate lookup error:', candidatesError)
    return { error: 'Failed to load books', status: 500 as const }
  }

  const { data: votes, error: votesError } = await supabaseAdmin
    .from('votes')
    .select('candidate_id, rank, voter_name, voter_name_key')
    .eq('ballot_id', ballot.id)

  if (votesError) {
    console.error('Public result vote lookup error:', votesError)
    return { error: 'Failed to load results', status: 500 as const }
  }

  const resultVotes = normalizeVotesForCounting(votes ?? [])
  const voterKeys = new Set(resultVotes.map(vote => vote.voter_name).filter(Boolean))

  return {
    data: {
      ballot,
      candidates: candidates ?? [],
      rounds: runRCV(resultVotes, candidates ?? []),
      voteCount: voterKeys.size,
    } satisfies PublicResults,
    status: 200 as const,
  }
}

function normalizeVotesForCounting(votes: VoteRow[]) {
  return votes.map(vote => ({
    candidate_id: vote.candidate_id,
    rank: vote.rank,
    voter_name: vote.voter_name_key ?? voterNameKey(vote.voter_name ?? ''),
  }))
}
