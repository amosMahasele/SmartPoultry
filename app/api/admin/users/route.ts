import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllUsers, updateUserStatus, initDB } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await initDB()
    const users = await getAllUsers()
    return NextResponse.json({ users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { userId, status, notes } = await req.json()
    if (!userId || !status) {
      return NextResponse.json({ error: 'userId and status required' }, { status: 400 })
    }
    const user = await updateUserStatus(Number(userId), status, notes)
    return NextResponse.json({ user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
