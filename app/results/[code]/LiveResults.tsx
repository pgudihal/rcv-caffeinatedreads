'use client'

import { useCallback, useEffect, useState } from 'react'
import { RoundResult } from '@/lib/rcv'
import Results from '@/app/vote/[code]/Results'

type Ballot = {
  id: string
  share_code: string
  is_open: boolean
}

type PublicResultsResponse = {
  ballot: Ballot
  rounds: RoundResult[]
  voteCount: number
}

export default function LiveResults({
  ballot,
  initialRounds,
  initialVoteCount,
  voterName,
}: {
  ballot: Ballot
  initialRounds: RoundResult[]
  initialVoteCount: number
  voterName?: string
}) {
  const [rounds, setRounds] = useState<RoundResult[]>(initialRounds)
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [isClosed, setIsClosed] = useState(!ballot.is_open)
  const [resultsError, setResultsError] = useState('')

  const refreshResults = useCallback(async () => {
    const res = await fetch(`/api/results/${ballot.share_code}`, { cache: 'no-store' })

    if (!res.ok) {
      setResultsError('Could not refresh live results.')
      return
    }

    const data = await res.json() as PublicResultsResponse
    setResultsError('')
    setRounds(data.rounds)
    setVoteCount(data.voteCount)
    setIsClosed(!data.ballot.is_open)
  }, [ballot.share_code])

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshResults()
    }, 0)
    const refreshInterval = window.setInterval(() => {
      void refreshResults()
    }, 3000)

    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(refreshInterval)
    }
  }, [refreshResults])

  return (
    <Results
      rounds={rounds}
      voterName={voterName}
      voteCount={voteCount}
      resultsError={resultsError}
      isClosed={isClosed}
    />
  )
}
