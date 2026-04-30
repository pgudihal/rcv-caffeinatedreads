'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type Ballot = {
  id: string
  title: string
  share_code: string
  is_open: boolean
  created_at: string
  vote_count: number
}

export default function AdminDashboardClient({ ballots }: { ballots: Ballot[] }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link href="/" className="text-sm" style={{ color: 'var(--muted)' }}>
          Back to home
        </Link>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="text-sm disabled:opacity-50"
          style={{ color: 'var(--muted)' }}
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Admin</p>
          <h1 className="text-3xl font-bold">Ballots</h1>
        </div>
        <Link
          href="/create"
          className="px-4 py-2 rounded-lg font-semibold text-center"
          style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        >
          Create Ballot
        </Link>
      </div>

      {ballots.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
        >
          <h2 className="font-semibold mb-2">No ballots yet</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Create your first ballot, then share its vote link with the book club.
          </p>
          <Link
            href="/create"
            className="inline-block px-4 py-2 rounded-lg font-semibold"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            Create Ballot
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ballots.map(ballot => (
            <BallotRow key={ballot.id} ballot={ballot} />
          ))}
        </div>
      )}
    </div>
  )
}

function BallotRow({ ballot }: { ballot: Ballot }) {
  const [copied, setCopied] = useState(false)
  const votePath = `/vote/${ballot.share_code}`
  const resultsPath = `/results/${ballot.share_code}`
  const voteUrl = useMemo(() => {
    if (typeof window === 'undefined') return votePath
    return `${window.location.origin}${votePath}`
  }, [votePath])

  async function copyVoteLink() {
    await navigator.clipboard.writeText(voteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{ballot.title}</h2>
          <p className="text-sm mt-1" style={{ color: ballot.is_open ? '#22c55e' : 'var(--muted)' }}>
            {ballot.is_open ? 'Open' : 'Closed'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {ballot.vote_count} vote{ballot.vote_count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link
            href={`/admin/ballot/${ballot.share_code}`}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            Manage
          </Link>
          <button
            onClick={copyVoteLink}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ border: '1px solid var(--card-border)' }}
          >
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <Link
            href={votePath}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-center"
            style={{ border: '1px solid var(--card-border)' }}
          >
            Vote Page
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
    </div>
  )
}
