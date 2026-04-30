'use client'

import { useCallback, useEffect, useState } from 'react'
import { runRCV, RoundResult } from '@/lib/rcv'
import { supabase } from '@/lib/supabase'
import { voterNameKey } from '@/lib/voter-name'
import Results from '@/app/vote/[code]/Results'

type Ballot = {
  id: string
  is_open: boolean
}

type Candidate = {
  id: string
  title: string
}

type Vote = {
  candidate_id: string
  rank: number
  voter_name: string
  voter_name_key?: string | null
}

export default function LiveResults({
  ballot,
  candidates,
  initialVotes,
  voterName,
}: {
  ballot: Ballot
  candidates: Candidate[]
  initialVotes: Vote[]
  voterName?: string
}) {
  const [rounds, setRounds] = useState<RoundResult[]>(() => runRCV(initialVotes, candidates))
  const [voteCount, setVoteCount] = useState(() => countVoters(initialVotes))
  const [resultsError, setResultsError] = useState('')

  const updateResults = useCallback((votes: Vote[]) => {
    setRounds(runRCV(votes, candidates))
    setVoteCount(countVoters(votes))
  }, [candidates])

  const refreshResults = useCallback(async () => {
    const { data, error } = await supabase
      .from('votes')
      .select('candidate_id, rank, voter_name, voter_name_key')
      .eq('ballot_id', ballot.id)

    if (error) {
      console.error('Results refresh error:', error)
      setResultsError('Could not refresh live results.')
      return
    }

    setResultsError('')
    updateResults(data ?? [])
  }, [ballot.id, updateResults])

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshResults()
    }, 0)

    const channel = supabase
      .channel(`results-votes:${ballot.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `ballot_id=eq.${ballot.id}`,
        },
        () => {
          void refreshResults()
        }
      )
      .subscribe()

    return () => {
      window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [ballot.id, refreshResults])

  return (
    <Results
      rounds={rounds}
      voterName={voterName}
      voteCount={voteCount}
      resultsError={resultsError}
      isClosed={!ballot.is_open}
    />
  )
}

function countVoters(votes: Vote[]) {
  return new Set(votes.map(vote => vote.voter_name_key ?? voterNameKey(vote.voter_name))).size
}
