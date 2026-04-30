import { supabase } from '@/lib/supabase'
import VoteClient from './VoteClient'

export default async function VotePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data: ballot } = await supabase
    .from('ballots')
    .select('*')
    .eq('share_code', code)
    .single()

  if (!ballot) return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Ballot not found.</p>
    </main>
  )

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('ballot_id', ballot.id)

  const { data: votes } = await supabase
    .from('votes')
    .select('*')
    .eq('ballot_id', ballot.id)

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-2">{ballot.title}</h1>
      <VoteClient
        ballot={ballot}
        candidates={candidates ?? []}
        existingVotes={votes ?? []}
      />
    </main>
  )
}