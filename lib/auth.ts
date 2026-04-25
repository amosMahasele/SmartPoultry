import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export interface TokenPayload {
  userId: number; email: string; role: string; status: string
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try { return jwt.verify(token, SECRET) as TokenPayload }
  catch { return null }
}

export async function getSession(): Promise<TokenPayload | null> {
  const store = await cookies()
  const token = store.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}