import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_COOKIE)?.value

  if (!verifyAdminSession(adminSession)) {
    return NextResponse.json({ error: 'Admin session expired' }, { status: 401 })
  }

  const { title, candidates } = await request.json()

  // Validate inputs
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Ballot title is required' }, { status: 400 })
  }

  if (!candidates || candidates.length < 2) {
    return NextResponse.json({ error: 'At least 2 books are required' }, { status: 400 })
  }

  // Create ballot
  const { data: ballot, error: ballotError } = await supabaseAdmin
    .from('ballots')
    .insert({ title: title.trim(), is_open: true })
    .select()
    .single()

  if (ballotError || !ballot) {
    console.error('Ballot insert error:', ballotError)
    return NextResponse.json({ error: 'Failed to create ballot' }, { status: 500 })
  }

  // Insert candidates
  const { error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .insert(candidates.map((title: string) => ({
      ballot_id: ballot.id,
      title: title.trim()
    })))

  if (candidatesError) {
    console.error('Candidate insert error:', candidatesError)
    return NextResponse.json({ error: 'Failed to add books' }, { status: 500 })
  }

  return NextResponse.json({ shareCode: ballot.share_code })
}
