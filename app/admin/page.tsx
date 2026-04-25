'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  name: string
  email: string
  farm_name: string | null
  farm_size: string | null
  phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  role: string
  created_at: string
  approved_at: string | null
  notes: string | null
}

const statusColors = {
  pending: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#fcd34d' },
  approved: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#86efac' },
  rejected: { bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)', text: '#f87171' },
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [updating, setUpdating] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401) { router.push('/'); return }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(userId: number, status: 'approved' | 'rejected') {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, notes: notes[userId] })
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status, notes: notes[userId] || null } : u))
      }
    } finally {
      setUpdating(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter)
  const counts = { all: users.length, pending: users.filter(u => u.status === 'pending').length, approved: users.filter(u => u.status === 'approved').length, rejected: users.filter(u => u.status === 'rejected').length }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <header style={{ padding: '16px 40px', borderBottom: '1px solid rgba(220,38,38,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: 18, color: '#ef4444' }}>SPD ADMIN PANEL</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#ef4444', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
      </header>

      <main style={{ padding: '40px', maxWidth: 1300, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: '0.05em', color: '#f5f5f5', marginBottom: 8 }}>USER MANAGEMENT</h1>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Review and approve farm access applications</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? 'rgba(220,38,38,0.15)' : '#141414', border: filter === f ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(220,38,38,0.1)', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', color: filter === f ? '#ef4444' : '#9ca3af', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ textTransform: 'capitalize' }}>{f}</span>
              <span style={{ background: 'rgba(220,38,38,0.15)', borderRadius: 100, padding: '2px 8px', fontSize: 12, color: '#f87171' }}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>No {filter === 'all' ? '' : filter} applications found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(user => {
              const sc = statusColors[user.status]
              return (
                <div key={user.id} style={{ background: '#141414', border: '1px solid rgba(220,38,38,0.1)', borderRadius: 16, padding: '28px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                    {/* User info */}
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5', marginBottom: 2 }}>{user.name}</h3>
                          <p style={{ fontSize: 13, color: '#9ca3af' }}>{user.email}</p>
                        </div>
                        <span style={{ marginLeft: 8, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 100, padding: '3px 12px', fontSize: 11, color: sc.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {user.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {user.farm_name && <div><span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Farm</span><p style={{ fontSize: 14, color: '#f5f5f5', marginTop: 2 }}>{user.farm_name}</p></div>}
                        {user.farm_size && <div><span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Size</span><p style={{ fontSize: 14, color: '#f5f5f5', marginTop: 2 }}>{user.farm_size} birds</p></div>}
                        {user.phone && <div><span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</span><p style={{ fontSize: 14, color: '#f5f5f5', marginTop: 2 }}>{user.phone}</p></div>}
                        <div><span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Applied</span><p style={{ fontSize: 14, color: '#f5f5f5', marginTop: 2 }}>{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                      </div>
                      {user.notes && (
                        <div style={{ marginTop: 12, background: 'rgba(220,38,38,0.05)', borderRadius: 8, padding: '10px 14px' }}>
                          <p style={{ fontSize: 12, color: '#9ca3af' }}><strong style={{ color: '#6b7280' }}>Admin note:</strong> {user.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {user.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
                        <textarea placeholder="Optional note (visible to admin only)..." value={notes[user.id] || ''} onChange={e => setNotes(p => ({...p, [user.id]: e.target.value}))}
                          style={{ background: '#0a0a0a', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 12px', color: '#f5f5f5', fontSize: 13, resize: 'vertical', minHeight: 64, fontFamily: "'DM Sans', sans-serif" }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => updateStatus(user.id, 'approved')} disabled={updating === user.id}
                            style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: updating === user.id ? 0.6 : 1 }}>
                            {updating === user.id ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={() => updateStatus(user.id, 'rejected')} disabled={updating === user.id}
                            style={{ flex: 1, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: updating === user.id ? 0.6 : 1 }}>
                            {updating === user.id ? '...' : '✗ Reject'}
                          </button>
                        </div>
                      </div>
                    )}
                    {user.status !== 'pending' && (
                      <button onClick={() => updateStatus(user.id, user.status === 'approved' ? 'rejected' : 'approved')} disabled={updating === user.id}
                        style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#9ca3af', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: updating === user.id ? 0.6 : 1 }}>
                        Change to {user.status === 'approved' ? 'Rejected' : 'Approved'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
