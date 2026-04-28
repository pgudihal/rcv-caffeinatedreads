import { supabase } from '@/lib/supabase'
import BallotClient from './BallotClient'

export default async function BallotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: ballot } = await supabase
    .from('ballots')
    .select('*')
    .eq('id', id)
    .single()

  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('ballot_id', id)

  if (!ballot) return <p>Ballot not found.</p>

  return (
    <main className="min-h-screen flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-2">{ballot.title}</h1>
      <p className="text-gray-600 mb-8">Drag to rank the books in your order of preference.</p>
      <BallotClient candidates={candidates ?? []} ballotId={id} />
    </main>
  )
}