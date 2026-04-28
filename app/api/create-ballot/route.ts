import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password, title, candidates } = await request.json()

  // Validate password
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // Validate inputs
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Ballot title is required' }, { status: 400 })
  }

  if (!candidates || candidates.length < 2) {
    return NextResponse.json({ error: 'At least 2 books are required' }, { status: 400 })
  }

  // Create ballot
  const { data: ballot, error: ballotError } = await supabase
    .from('ballots')
    .insert({ title: title.trim(), is_open: true })
    .select()
    .single()

  if (ballotError || !ballot) {
    return NextResponse.json({ error: 'Failed to create ballot' }, { status: 500 })
  }

  // Insert candidates
  const { error: candidatesError } = await supabase
    .from('candidates')
    .insert(candidates.map((title: string) => ({
      ballot_id: ballot.id,
      title: title.trim()
    })))

  if (candidatesError) {
    return NextResponse.json({ error: 'Failed to add books' }, { status: 500 })
  }

  return NextResponse.json({ shareCode: ballot.share_code })
}