import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; voterKey: string }> }
) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
  }

  const { code, voterKey } = await params
  const decodedVoterKey = decodeURIComponent(voterKey)

  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .select('id')
    .eq('share_code', code)
    .single()

  if (ballotError || !ballot) {
    return NextResponse.json({ error: 'Ballot not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('votes')
    .delete()
    .eq('ballot_id', ballot.id)
    .eq('voter_name_key', decodedVoterKey)

  if (error) {
    console.error('Vote delete error:', error)
    return NextResponse.json({ error: 'Failed to delete vote' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
