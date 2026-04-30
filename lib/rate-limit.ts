import 'server-only'

import { NextRequest, NextResponse } from 'next/server'

type RateLimitRecord = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

const store = globalThis as typeof globalThis & {
  __rcvRateLimitStore?: Map<string, RateLimitRecord>
}

const rateLimitStore = store.__rcvRateLimitStore ?? new Map<string, RateLimitRecord>()
store.__rcvRateLimitStore = rateLimitStore

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  return forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    cleanupExpired(now)
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfter: 0,
  }
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests. Try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  )
}

function cleanupExpired(now: number) {
  if (rateLimitStore.size < 500) return

  for (const [key, record] of rateLimitStore) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}
