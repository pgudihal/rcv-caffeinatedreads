import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: ballots } = await supabase
    .from('ballots')
    .select('*')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">📚 Caffeinated Reads Voting</h1>
      <p className="text-gray-500 mb-8">Ranked Choice is way</p>

      {ballots?.length === 0 && (
        <p className="text-gray-400 italic">No ballots yet.</p>
      )}

      {ballots?.map(ballot => (
        <div key={ballot.id} className="border rounded-lg p-4 mb-4 w-full max-w-md">
          <h2 className="text-xl font-semibold">{ballot.title}</h2>
          <p className="text-sm text-gray-400">{ballot.is_open ? '🟢 Open' : '🔴 Closed'}</p>
        </div>
      ))}
    </main>
  )
}