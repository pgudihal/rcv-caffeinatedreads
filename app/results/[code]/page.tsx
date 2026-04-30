import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LiveResults from './LiveResults'

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data: ballot } = await supabase
    .from('ballots')
    .select('id, title, share_code, is_open')
    .eq('share_code', code)
    .single()

  if (!ballot) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 sm:p-8">
        <p>Ballot not found.</p>
      </main>
    )
  }

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, title')
    .eq('ballot_id', ballot.id)

  const { data: votes } = await supabase
    .from('votes')
    .select('candidate_id, rank, voter_name, voter_name_key')
    .eq('ballot_id', ballot.id)

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Back to home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{ballot.title}</h1>
      <p className="mb-8" style={{ color: 'var(--muted)' }}>Live results</p>

      <LiveResults
        ballot={ballot}
        candidates={candidates ?? []}
        initialVotes={votes ?? []}
      />
    </main>
  )
}
