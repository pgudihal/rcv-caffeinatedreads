import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    redirect('/')
  }

  const { data: ballots } = await supabaseAdmin
    .from('ballots')
    .select('id, title, share_code, is_open, created_at')
    .order('created_at', { ascending: false })

  const ballotIds = (ballots ?? []).map(ballot => ballot.id)
  const { data: votes } = ballotIds.length > 0
    ? await supabaseAdmin
        .from('votes')
        .select('ballot_id, voter_name, voter_name_key')
        .in('ballot_id', ballotIds)
    : { data: [] }

  const voteCounts = new Map<string, number>()
  for (const ballotId of ballotIds) {
    const voterNames = new Set(
      (votes ?? [])
        .filter(vote => vote.ballot_id === ballotId)
        .map(vote => {
          if (typeof vote.voter_name_key === 'string') return vote.voter_name_key
          return typeof vote.voter_name === 'string' ? vote.voter_name.trim().replace(/\s+/g, ' ').toLowerCase() : ''
        })
        .filter(Boolean)
    )
    voteCounts.set(ballotId, voterNames.size)
  }

  const ballotsWithCounts = (ballots ?? []).map(ballot => ({
    ...ballot,
    vote_count: voteCounts.get(ballot.id) ?? 0,
  }))

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <AdminDashboardClient ballots={ballotsWithCounts} />
    </main>
  )
}
