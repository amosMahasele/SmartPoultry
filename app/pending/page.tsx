'use client'
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#141414', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 20, padding: '56px 48px', maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: '0.05em', color: '#f5f5f5', marginBottom: 16 }}>
          APPLICATION PENDING
        </h1>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 32 }}>
          Your application to join Smart Poultry Decisions is currently under review. Our team will assess your farm details and notify you once your account has been approved.
        </p>
        <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600, marginBottom: 6 }}>What happens next?</p>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            An admin will review your application within 1–2 business days. You'll receive access credentials via email once approved.
          </p>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', color: '#ef4444', borderRadius: 10, padding: '12px 28px', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
