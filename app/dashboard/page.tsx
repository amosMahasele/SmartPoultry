'use client'
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const metrics = [
    { label: 'Feed Conversion Ratio', value: '1.72', unit: 'FCR', change: '↓ 0.08 vs last cycle', good: true },
    { label: 'Mortality Rate', value: '2.3', unit: '%', change: '↑ 0.4% — watch closely', good: false },
    { label: 'Avg. Body Weight', value: '2.14', unit: 'kg', change: '↑ 0.12kg vs target', good: true },
    { label: 'Feed Cost / Bird', value: 'M 48.50', unit: '', change: 'Within budget', good: true },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <header style={{ padding: '16px 40px', borderBottom: '1px solid rgba(220,38,38,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: 18, color: '#ef4444' }}>SMART POULTRY DECISIONS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#ef4444', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </header>

      <main style={{ padding: '40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: '0.05em', color: '#f5f5f5', marginBottom: 8 }}>FARM DASHBOARD</h1>
          <p style={{ color: '#9ca3af', fontSize: 15 }}>Welcome back. Here's your farm performance overview.</p>
        </div>

        {/* Alert banner */}
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f87171', marginBottom: 2 }}>Early Warning Alert</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Mortality rate has increased by 0.4% over the last 48 hours. Consider veterinary consultation.</p>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ background: '#141414', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 16, padding: '28px 24px' }}>
              <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 16 }}>{m.label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#f5f5f5', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.03em' }}>{m.value}</span>
                {m.unit && <span style={{ fontSize: 14, color: '#6b7280' }}>{m.unit}</span>}
              </div>
              <p style={{ fontSize: 12, color: m.good ? '#86efac' : '#f87171' }}>{m.change}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ background: '#141414', border: '1px solid rgba(220,38,38,0.1)', borderRadius: 16, padding: '32px' }}>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '0.05em', color: '#f5f5f5', marginBottom: 24 }}>QUICK ACTIONS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { icon: '📝', label: 'Log Daily Data' },
              { icon: '📈', label: 'View Forecasts' },
              { icon: '💊', label: 'Health Records' },
              { icon: '💰', label: 'Financial Report' },
            ].map(a => (
              <button key={a.label} style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12, padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#f5f5f5', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, transition: 'background 0.2s' }}>
                <span style={{ fontSize: 28 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
