import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { initDB, getUserByEmail } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { email, password } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

    // Admin shortcut — credentials from env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = signToken({ userId: 0, email, role: 'admin', status: 'approved' })
      const res = NextResponse.json({ role: 'admin', status: 'approved' })
      res.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })
      return res
    }

    const user = await getUserByEmail(email)
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const token = signToken({ userId: user.id, email: user.email, role: user.role, status: user.status })
    const res = NextResponse.json({ role: user.role, status: user.status })
    res.cookies.set('auth-token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}