import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { initDB, createUser, getUserByEmail } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    await initDB()
    const { name, email, password, farmName, farmSize, phone } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await createUser({ name, email, passwordHash, farmName, farmSize, phone })

    return NextResponse.json({ message: 'Application submitted successfully', userId: user.id }, { status: 201 })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
