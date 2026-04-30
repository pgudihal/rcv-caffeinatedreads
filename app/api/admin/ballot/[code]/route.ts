import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
  }

  const { code } = await params

  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .select('id, is_open')
    .eq('share_code', code)
    .single()

  if (ballotError || !ballot) {
    return NextResponse.json({ error: 'Ballot not found' }, { status: 404 })
  }

  const { data: votes, error: votesError } = await supabaseAdmin
    .from('votes')
    .select('candidate_id, rank, voter_name, voter_name_key')
    .eq('ballot_id', ballot.id)

  if (votesError) {
    console.error('Admin votes lookup error:', votesError)
    return NextResponse.json({ error: 'Failed to load votes' }, { status: 500 })
  }

  return NextResponse.json({
    isOpen: ballot.is_open,
    votes: votes ?? [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
  }

  const { code } = await params
  const { isOpen } = await request.json()

  if (typeof isOpen !== 'boolean') {
    return NextResponse.json({ error: 'Invalid ballot status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('ballots')
    .update({ is_open: isOpen })
    .eq('share_code', code)

  if (error) {
    console.error('Ballot status update error:', error)
    return NextResponse.json({ error: 'Failed to update ballot' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
  }

  const { code } = await params

  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .select('id')
    .eq('share_code', code)
    .single()

  if (ballotError || !ballot) {
    return NextResponse.json({ error: 'Ballot not found' }, { status: 404 })
  }

  const { error: votesError } = await supabaseAdmin
    .from('votes')
    .delete()
    .eq('ballot_id', ballot.id)

  if (votesError) {
    console.error('Ballot votes delete error:', votesError)
    return NextResponse.json({ error: 'Failed to delete votes' }, { status: 500 })
  }

  const { error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .delete()
    .eq('ballot_id', ballot.id)

  if (candidatesError) {
    console.error('Ballot candidates delete error:', candidatesError)
    return NextResponse.json({ error: 'Failed to delete books' }, { status: 500 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('ballots')
    .delete()
    .eq('id', ballot.id)

  if (deleteError) {
    console.error('Ballot delete error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete ballot' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
