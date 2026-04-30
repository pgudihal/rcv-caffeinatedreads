import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

type RankingInput = {
  candidate_id?: unknown
  rank?: unknown
}

export async function POST(request: NextRequest) {
  const { rankings, ballotId, voterName } = await request.json()
  const trimmedVoterName = typeof voterName === 'string' ? voterName.trim() : ''

  if (!ballotId || typeof ballotId !== 'string') {
    return NextResponse.json({ error: 'Invalid ballot' }, { status: 400 })
  }

  if (!trimmedVoterName) {
    return NextResponse.json({ error: 'Voter name is required' }, { status: 400 })
  }

  if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
    return NextResponse.json({ error: 'Invalid rankings' }, { status: 400 })
  }

  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .select('id, is_open')
    .eq('id', ballotId)
    .maybeSingle()

  if (ballotError) {
    console.error('Ballot lookup error:', ballotError)
    return NextResponse.json({ error: 'Failed to verify ballot' }, { status: 500 })
  }

  if (!ballot) {
    return NextResponse.json({ error: 'Ballot not found' }, { status: 404 })
  }

  if (!ballot.is_open) {
    return NextResponse.json({ error: 'This ballot is closed' }, { status: 400 })
  }

  const { data: candidates, error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .select('id')
    .eq('ballot_id', ballotId)

  if (candidatesError) {
    console.error('Candidate lookup error:', candidatesError)
    return NextResponse.json({ error: 'Failed to verify books' }, { status: 500 })
  }

  const candidateIds = new Set((candidates ?? []).map(candidate => candidate.id))

  if (candidateIds.size < 2 || rankings.length !== candidateIds.size) {
    return NextResponse.json({ error: 'Invalid rankings' }, { status: 400 })
  }

  const seenCandidates = new Set<string>()
  const seenRanks = new Set<number>()

  for (const ranking of rankings as RankingInput[]) {
    const candidateId = ranking.candidate_id
    const rank = ranking.rank

    if (
      typeof candidateId !== 'string' ||
      !candidateIds.has(candidateId) ||
      seenCandidates.has(candidateId) ||
      typeof rank !== 'number' ||
      !Number.isInteger(rank) ||
      rank < 1 ||
      rank > candidateIds.size ||
      seenRanks.has(rank)
    ) {
      return NextResponse.json({ error: 'Invalid rankings' }, { status: 400 })
    }

    seenCandidates.add(candidateId)
    seenRanks.add(rank)
  }

  // Double check duplicate server-side
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('votes')
    .select('id')
    .eq('ballot_id', ballotId)
    .ilike('voter_name', trimmedVoterName)
    .limit(1)

  if (existingError) {
    console.error('Existing vote lookup error:', existingError)
    return NextResponse.json({ error: 'Failed to verify voter' }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'This name has already voted' }, { status: 400 })
  }

  const voteRows = (rankings as RankingInput[]).map(ranking => ({
    ballot_id: ballotId,
    candidate_id: ranking.candidate_id as string,
    rank: ranking.rank as number,
    voter_name: trimmedVoterName,
  }))

  const { error } = await supabaseAdmin
    .from('votes')
    .insert(voteRows)

  if (error) {
    console.error('Vote insert error:', error)
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
