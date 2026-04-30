import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSession } from '@/lib/admin-session'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({
    key: `admin-login:${ip}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  })

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter)
  }

  const { password } = await request.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })

  return NextResponse.json({ success: true })
}
