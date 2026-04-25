import { neon, NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

function getSQL() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

export async function initDB() {
  const sql = getSQL()
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      farm_name VARCHAR(255),
      farm_size VARCHAR(100),
      location VARCHAR(255),
      phone VARCHAR(50),
      flock_type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
      role VARCHAR(20) DEFAULT 'user'
        CHECK (role IN ('user','admin')),
      created_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP,
      notes TEXT
    )
  `
}

export async function createUser(data: {
  name: string; email: string; passwordHash: string
  farmName?: string; farmSize?: string; location?: string
  phone?: string; flockType?: string
}) {
  const sql = getSQL()
  const r = await sql`
    INSERT INTO users
      (name, email, password_hash, farm_name, farm_size, location, phone, flock_type)
    VALUES
      (${data.name}, ${data.email}, ${data.passwordHash},
       ${data.farmName ?? null}, ${data.farmSize ?? null},
       ${data.location ?? null}, ${data.phone ?? null}, ${data.flockType ?? null})
    RETURNING id, name, email, status, role, created_at
  `
  return r[0]
}

export async function getUserByEmail(email: string) {
  const sql = getSQL()
  const r = await sql`SELECT * FROM users WHERE email = ${email}`
  return r[0] ?? null
}

export async function getAllUsers() {
  const sql = getSQL()
  return await sql`
    SELECT id, name, email, farm_name, farm_size, location,
           phone, flock_type, status, role, created_at, approved_at, notes
    FROM users ORDER BY created_at DESC
  `
}

export async function updateUserStatus(
  id: number, status: 'approved' | 'rejected', notes?: string
) {
  const sql = getSQL()
  const r = await sql`
    UPDATE users
    SET status     = ${status},
        approved_at = ${status === 'approved' ? new Date().toISOString() : null},
        notes       = ${notes ?? null}
    WHERE id = ${id}
    RETURNING id, name, email, status
  `
  return r[0]
}