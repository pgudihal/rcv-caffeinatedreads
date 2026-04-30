'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { runRCV, RoundResult } from '@/lib/rcv'
import { voterNameKey } from '@/lib/voter-name'
import Results from '@/app/vote/[code]/Results'

type Ballot = {
  id: string
  title: string
  share_code: string
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

export default function AdminBallotClient({
  ballot,
  candidates,
  initialVotes,
}: {
  ballot: Ballot
  candidates: Candidate[]
  initialVotes: Vote[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(ballot.is_open)
  const [statusError, setStatusError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [rounds, setRounds] = useState<RoundResult[]>(() => runRCV(initialVotes, candidates))
  const [voteCount, setVoteCount] = useState(() => countVoters(initialVotes))
  const [votes, setVotes] = useState(initialVotes)
  const [resultsError, setResultsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deletingVoteKey, setDeletingVoteKey] = useState<string | null>(null)
  const [voteDeleteError, setVoteDeleteError] = useState('')

  const votePath = `/vote/${ballot.share_code}`
  const resultsPath = `/results/${ballot.share_code}`
  const voteUrl = useMemo(() => {
    if (typeof window === 'undefined') return votePath
    return `${window.location.origin}${votePath}`
  }, [votePath])

  const updateResults = useCallback((votes: Vote[]) => {
    setVotes(votes)
    setRounds(runRCV(votes, candidates))
    setVoteCount(countVoters(votes))
  }, [candidates])

  const refreshResults = useCallback(async () => {
    const res = await fetch(`/api/admin/ballot/${ballot.share_code}`, { cache: 'no-store' })

    if (!res.ok) {
      setResultsError('Could not refresh live results.')
      return
    }

    const data = await res.json() as { isOpen: boolean; votes: Vote[] }
    setResultsError('')
    setIsOpen(data.isOpen)
    updateResults(data.votes)
  }, [ballot.share_code, updateResults])

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

  async function copyVoteLink() {
    await navigator.clipboard.writeText(voteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function toggleOpen() {
    setStatusError('')
    setUpdatingStatus(true)

    const nextStatus = !isOpen
    const res = await fetch(`/api/admin/ballot/${ballot.share_code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: nextStatus }),
    })

    if (!res.ok) {
      const data = await res.json()
      setStatusError(data.error || 'Could not update ballot status.')
      setUpdatingStatus(false)
      return
    }

    setIsOpen(nextStatus)
    setUpdatingStatus(false)
  }

  async function deleteBallot() {
    setDeleteError('')
    setDeleting(true)

    const res = await fetch(`/api/admin/ballot/${ballot.share_code}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      setDeleteError(data.error || 'Could not delete ballot.')
      setDeleting(false)
      return
    }

    router.push('/admin')
  }

  async function deleteVote(voterKey: string) {
    setVoteDeleteError('')
    setDeletingVoteKey(voterKey)

    const res = await fetch(`/api/admin/ballot/${ballot.share_code}/vote/${encodeURIComponent(voterKey)}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const data = await res.json()
      setVoteDeleteError(data.error || 'Could not delete vote.')
      setDeletingVoteKey(null)
      return
    }

    await refreshResults()
    setDeletingVoteKey(null)
  }

  const submittedVotes = getSubmittedVotes(votes)

  return (
    <div className="w-full max-w-2xl">
      <Link href="/admin" className="inline-block text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Back to admin
      </Link>

      <div className="mb-8">
        <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Admin</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{ballot.title}</h1>
            <p className="text-sm" style={{ color: isOpen ? '#22c55e' : 'var(--muted)' }}>
              {isOpen ? 'Open for voting' : 'Closed'}
            </p>
          </div>
          <button
            onClick={toggleOpen}
            disabled={updatingStatus}
            className="px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            {updatingStatus ? 'Updating...' : isOpen ? 'Close Voting' : 'Reopen Voting'}
          </button>
        </div>
        {statusError && <p className="text-red-400 mt-3 text-sm">{statusError}</p>}
      </div>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Share Link</h2>
        <div
          className="flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
        >
          <p className="flex-1 break-all text-sm" style={{ color: 'var(--muted)' }}>{voteUrl}</p>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <button
              onClick={copyVoteLink}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ border: '1px solid var(--card-border)' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <Link
              href={votePath}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
              style={{ border: '1px solid var(--card-border)' }}
            >
              Open
            </Link>
            <Link
              href={resultsPath}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
              style={{ border: '1px solid var(--card-border)' }}
            >
              Results
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Live Results</h2>
        <Results
          rounds={rounds}
          voteCount={voteCount}
          resultsError={resultsError}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-semibold mb-3">Submitted Votes</h2>
        {submittedVotes.length === 0 ? (
          <div
            className="rounded-lg p-4 text-sm"
            style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            No votes have been submitted yet.
          </div>
        ) : (
          <div className="space-y-2">
            {submittedVotes.map(vote => (
              <div
                key={vote.key}
                className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
              >
                <div>
                  <p className="font-semibold">{vote.name}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {vote.rankCount} ranked book{vote.rankCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteVote(vote.key)}
                  disabled={deletingVoteKey === vote.key}
                  className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                >
                  {deletingVoteKey === vote.key ? 'Deleting...' : 'Delete Vote'}
                </button>
              </div>
            ))}
          </div>
        )}
        {voteDeleteError && <p className="text-red-400 mt-3 text-sm">{voteDeleteError}</p>}
      </section>

      <section className="mt-10 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
        <h2 className="font-semibold mb-2">Danger Zone</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Delete this ballot and all of its votes. This cannot be undone.
        </p>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid #ef4444', color: '#ef4444' }}
          >
            Delete Ballot
          </button>
        ) : (
          <div
            className="rounded-lg p-4"
            style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
          >
            <p className="text-sm mb-4">
              Delete <span className="font-semibold">{ballot.title}</span>?
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={deleteBallot}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: '#ef4444', color: 'white' }}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteError('')
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ border: '1px solid var(--card-border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteError && <p className="text-red-400 mt-3 text-sm">{deleteError}</p>}
      </section>
    </div>
  )
}

function countVoters(votes: Vote[]) {
  return new Set(votes.map(vote => vote.voter_name_key ?? voterNameKey(vote.voter_name))).size
}

function getSubmittedVotes(votes: Vote[]) {
  const votesByVoter = new Map<string, { key: string; name: string; rankCount: number }>()

  for (const vote of votes) {
    const key = vote.voter_name_key ?? voterNameKey(vote.voter_name)
    const existing = votesByVoter.get(key)

    if (existing) {
      existing.rankCount += 1
    } else {
      votesByVoter.set(key, {
        key,
        name: vote.voter_name,
        rankCount: 1,
      })
    }
  }

  return [...votesByVoter.values()].sort((a, b) => a.name.localeCompare(b.name))
}
