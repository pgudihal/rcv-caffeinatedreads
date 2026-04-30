'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Ballot = {
  id: string
  title: string
  share_code: string
  is_open: boolean
}

export default function Home() {
  const router = useRouter()
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('ballots')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setBallots(data ?? []))
  }, [])

async function handlePasswordSubmit() {
  if (!password) return setError('Please enter a password')
  setError('')

  const res = await fetch('/api/check-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })

  if (!res.ok) {
    setError('Incorrect password')
    return
  }

  router.push('/admin')
}

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <h1 className="text-4xl font-bold mb-2">📚 Book Club Voting</h1>
      <p className="mb-8" style={{ color: 'var(--muted)' }}>Ranked choice voting for your book club.</p>

      <button
        onClick={() => setShowModal(true)}
        className="mb-12 px-6 py-3 rounded-lg font-semibold transition-colors"
        style={{ background: 'var(--foreground)', color: 'var(--background)' }}
      >
        Manage Ballots
      </button>

      {ballots.length === 0 ? (
        <div
          className="w-full max-w-md rounded-lg p-6 text-center"
          style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
        >
          <h2 className="font-semibold mb-2">No ballots yet</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Check back later, or use admin access to create the first ballot.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Active Ballots</h2>
          {ballots.map(ballot => (
            <Link
              key={ballot.id}
              href={`/vote/${ballot.share_code}`}
              className="block rounded-lg p-4 mb-3 transition-colors hover:opacity-80"
              style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
            >
              <p className="font-semibold">{ballot.title}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {ballot.is_open ? '🟢 Open' : '🔴 Closed'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Password Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setShowModal(false); setPassword(''); setError('') }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ background: 'var(--card-background)', border: '1px solid var(--card-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1">Admin Access</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Enter the password to manage ballots.</p>

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-lg p-3 mb-3"
              style={{ background: 'var(--background)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setPassword(''); setError('') }}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--card-border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--foreground)', color: 'var(--background)' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
