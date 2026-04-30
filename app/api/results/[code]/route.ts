import { getPublicResultsByCode } from '@/lib/public-results'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const result = await getPublicResultsByCode(code)

  if (!result.data) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(result.data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
