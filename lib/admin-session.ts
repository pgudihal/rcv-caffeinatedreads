import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE = 'admin_session'
export const ADMIN_SESSION_MAX_AGE = 15 * 60

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD!
}

function sign(expires: number) {
  return createHmac('sha256', getSecret())
    .update(String(expires))
    .digest('hex')
}

export function createAdminSession() {
  const expires = Date.now() + ADMIN_SESSION_MAX_AGE * 1000
  return `${expires}.${sign(expires)}`
}

export function verifyAdminSession(value?: string) {
  if (!value) return false

  const [expiresRaw, signature] = value.split('.')
  const expires = Number(expiresRaw)

  if (!expires || !signature || Date.now() > expires) {
    return false
  }

  const expected = sign(expires)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}
