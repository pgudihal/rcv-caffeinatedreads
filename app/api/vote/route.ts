import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { rankings, ballotId, voterName } = await request.json()

  if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
    return NextResponse.json({ error: 'Invalid rankings' }, { status: 400 })
  }

  // Double check duplicate server-side
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('ballot_id', ballotId)
    .ilike('voter_name', voterName)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'This name has already voted' }, { status: 400 })
  }

  const { error } = await supabase
    .from('votes')
    .insert(rankings)

  if (error) {
    console.error('Vote insert error:', error)
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}