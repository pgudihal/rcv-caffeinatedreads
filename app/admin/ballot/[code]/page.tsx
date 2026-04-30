import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminBallotClient from './AdminBallotClient'

export default async function AdminBallotPage({ params }: { params: Promise<{ code: string }> }) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    redirect('/')
  }

  const { code } = await params

  const { data: ballot } = await supabaseAdmin
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

  const { data: candidates } = await supabaseAdmin
    .from('candidates')
    .select('id, title')
    .eq('ballot_id', ballot.id)

  const { data: votes } = await supabaseAdmin
    .from('votes')
    .select('candidate_id, rank, voter_name, voter_name_key')
    .eq('ballot_id', ballot.id)

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <AdminBallotClient
        ballot={ballot}
        candidates={candidates ?? []}
        initialVotes={votes ?? []}
      />
    </main>
  )
}
