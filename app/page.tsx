'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ─── tiny animated counter ─────────────────────────────── */
function Counter({ to, decimals = 0, prefix = '', suffix = '' }:
  { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const dur = 1800, steps = 60, inc = to / steps
    let cur = 0
    const t = setInterval(() => {
      cur = Math.min(cur + inc, to)
      setVal(cur)
      if (cur >= to) clearInterval(t)
    }, dur / steps)
    return () => clearInterval(t)
  }, [to])
  return <>{prefix}{val.toFixed(decimals)}{suffix}</>
}

/* ─── live ticker ────────────────────────────────────────── */
const TICKER_ITEMS = [
  'FCR OPTIMISATION · REGRESSION MODEL ACTIVE',
  'MORTALITY Δ = −0.004 · ALERT THRESHOLD: 3.5%',
  'FLOCK UNIFORMITY CV < 8% · TARGET MET',
  'BREAK-EVEN = FIXED_COST / (PRICE − VARIABLE_COST)',
  'FEED CONVERSION RATIO: Δw/Δf → MINIMISE',
  'HEN-DAY % = (EGGS / HENS × DAYS) × 100',
  'ROI = (NET_PROFIT / COST) × 100 · TRACKING',
  'BAYESIAN OUTBREAK PRIOR: P(D|S) · UPDATING',
]

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px 0', background: 'rgba(7,21,53,0.6)' }}>
      <div className="mono" style={{ display: 'flex', gap: 64, whiteSpace: 'nowrap', animation: 'ticker 30s linear infinite', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.08em' }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'var(--blue-400)', opacity: 0.5 }}>▸</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── formula display ────────────────────────────────────── */
function FormulaCard({ label, formula, desc }: { label: string; formula: string; desc: string }) {
  return (
    <div style={{ background: 'var(--navy-800)', border: '1px solid var(--border-hi)', borderRadius: 12, padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg, var(--cyan), var(--blue-400))' }} />
      <p style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 12, textTransform: 'uppercase' as const, fontWeight: 700 }}>{label}</p>
      <div className="mono" style={{ fontSize: 15, color: 'var(--blue-100)', marginBottom: 12, lineHeight: 1.6, wordBreak: 'break-word' as const }}>{formula}</div>
      <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

/* ─── mini spark chart ───────────────────────────────────── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120, h = 40
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={pts.split(' ').at(-1)!.split(',')[0]} cy={pts.split(' ').at(-1)!.split(',')[1]} r={3} fill={color} />
    </svg>
  )
}

/* ─── main component ─────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'landing' | 'login' | 'signup'>('landing')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    farmName: '', farmSize: '', location: '', phone: '', flockType: ''
  })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      if (data.role === 'admin') router.push('/admin')
      else if (data.status === 'approved') router.push('/dashboard')
      else router.push('/pending')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match'); setLoading(false); return
    }
    if (signupForm.password.length < 8) {
      setError('Password must be at least 8 characters'); setLoading(false); return
    }
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Signup failed'); return }
      setSuccess('Application submitted. Pending admin approval — you\'ll be notified once activated.')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  /* ── AUTH FORMS ── */
  if (mode === 'login' || mode === 'signup') {
    const isLogin = mode === 'login'
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex' }} className="grid-bg">
        {/* left panel — math decoration */}
        <div style={{ flex: 1, display: 'none', background: 'var(--navy-900)', borderRight: '1px solid var(--border)', padding: '60px 48px', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}
          className="auth-left">
          <div>
            <Logo />
            <div style={{ marginTop: 64 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 32, textTransform: 'uppercase' as const }}>Core Analytics Engine</p>
              {[
                { label: 'Feed Conversion', formula: 'FCR = Δmass_feed / Δmass_bird', desc: 'Minimised via gradient descent on daily intake vs. weight gain data.' },
                { label: 'Outbreak Risk Score', formula: 'P(outbreak) = 1 − e^(−λt)', desc: 'Poisson arrival model with λ calibrated on regional disease incidence.' },
                { label: 'Profit Projection', formula: 'π = P·Q − (FC + VC·Q)', desc: 'Linear profit function with variable feed cost sensitivity analysis.' },
              ].map(f => <div key={f.label} style={{ marginBottom: 20 }}><FormulaCard {...f} /></div>)}
            </div>
          </div>
          <p className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>SPD ENGINE v2.1 · NEON DB · NEXT.JS 14</p>
        </div>

        {/* right panel — form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: isLogin ? 420 : 520 }}>
            <div style={{ marginBottom: 40 }}><Logo /></div>

            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
              {isLogin ? 'Sign in' : 'Apply for access'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 32 }}>
              {isLogin
                ? 'Enter your credentials to access the analytics platform'
                : 'Submit your farm details — an admin will review and activate your account'}
            </p>

            {error && <Alert type="error">{error}</Alert>}
            {success && <Alert type="success">{success}</Alert>}

            {!success && (
              <form onSubmit={isLogin ? handleLogin : handleSignup}>
                {!isLogin && (
                  <>
                    <Row>
                      <Field label="Full name *">
                        <Input placeholder="John Mokoena" required
                          value={signupForm.name} onChange={v => setSignupForm(p => ({ ...p, name: v }))} />
                      </Field>
                      <Field label="Phone">
                        <Input placeholder="+266 5xxx xxxx"
                          value={signupForm.phone} onChange={v => setSignupForm(p => ({ ...p, phone: v }))} />
                      </Field>
                    </Row>
                    <Row>
                      <Field label="Farm name">
                        <Input placeholder="Green Valley Poultry"
                          value={signupForm.farmName} onChange={v => setSignupForm(p => ({ ...p, farmName: v }))} />
                      </Field>
                      <Field label="Location">
                        <Input placeholder="Maseru, Lesotho"
                          value={signupForm.location} onChange={v => setSignupForm(p => ({ ...p, location: v }))} />
                      </Field>
                    </Row>
                    <Row>
                      <Field label="Flock type">
                        <Select value={signupForm.flockType} onChange={v => setSignupForm(p => ({ ...p, flockType: v }))}>
                          <option value="">Select type</option>
                          <option value="broiler">Broiler</option>
                          <option value="layer">Layer</option>
                          <option value="mixed">Mixed</option>
                          <option value="breeder">Breeder</option>
                        </Select>
                      </Field>
                      <Field label="Bird count">
                        <Select value={signupForm.farmSize} onChange={v => setSignupForm(p => ({ ...p, farmSize: v }))}>
                          <option value="">Select range</option>
                          <option value="1k-5k">1,000 – 5,000</option>
                          <option value="5k-15k">5,000 – 15,000</option>
                          <option value="15k-50k">15,000 – 50,000</option>
                          <option value="50k+">50,000+</option>
                        </Select>
                      </Field>
                    </Row>
                  </>
                )}

                <Field label="Email address *">
                  <Input type="email" placeholder="you@example.com" required
                    value={isLogin ? loginForm.email : signupForm.email}
                    onChange={v => isLogin
                      ? setLoginForm(p => ({ ...p, email: v }))
                      : setSignupForm(p => ({ ...p, email: v }))} />
                </Field>

                {!isLogin && (
                  <Row>
                    <Field label="Password *">
                      <Input type="password" placeholder="Min 8 chars" required
                        value={signupForm.password} onChange={v => setSignupForm(p => ({ ...p, password: v }))} />
                    </Field>
                    <Field label="Confirm password *">
                      <Input type="password" placeholder="••••••••" required
                        value={signupForm.confirmPassword} onChange={v => setSignupForm(p => ({ ...p, confirmPassword: v }))} />
                    </Field>
                  </Row>
                )}

                {isLogin && (
                  <Field label="Password *">
                    <Input type="password" placeholder="••••••••" required
                      value={loginForm.password} onChange={v => setLoginForm(p => ({ ...p, password: v }))} />
                  </Field>
                )}

                <Btn loading={loading}>
                  {loading ? 'Processing…' : isLogin ? 'Sign In →' : 'Submit Application →'}
                </Btn>
              </form>
            )}

            <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' as const }}>
              {isLogin ? "Don't have access? " : 'Already have an account? '}
              <span style={{ color: 'var(--blue-300)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(''); setSuccess('') }}>
                {isLogin ? 'Apply here' : 'Sign in'}
              </span>
            </p>
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' as const }}>
              <span style={{ color: 'var(--text-dim)', cursor: 'pointer' }}
                onClick={() => { setMode('landing'); setError(''); setSuccess('') }}>
                ← Back to home
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── LANDING PAGE ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 64, borderBottom: '1px solid var(--border)', background: 'rgba(2,12,31,0.92)', backdropFilter: 'blur(16px)' }}>
        <Logo />
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          PRECISION POULTRY ANALYTICS · AFRICA
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={navBtnStyle} onClick={() => setMode('login')}>Sign In</button>
          <button style={primaryBtnStyle} onClick={() => setMode('signup')}>Apply for Access</button>
        </div>
      </nav>

      {/* LIVE TICKER */}
      <Ticker />

      {/* HERO */}
      <section className="grid-bg" style={{ padding: '80px 48px 64px', position: 'relative', overflow: 'hidden' }}>
        {/* glow orb */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--cyan)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: 'blink 1.4s ease infinite' }} />
              SYSTEM ONLINE · MODEL v2.1 ACTIVE
            </div>
            <h1 style={{ fontSize: 'clamp(40px,5vw,64px)', fontWeight: 800, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-0.02em' }}>
              Quantitative<br />
              <span style={{ color: 'var(--blue-400)' }}>Poultry Intelligence</span><br />
              for Africa
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-mid)', lineHeight: 1.8, maxWidth: 480, marginBottom: 40 }}>
              Real-time statistical modelling, predictive outbreak detection, and profit optimisation — engineered for African poultry operations running 1,000 to 50,000 birds.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
              <button style={primaryBtnStyle} onClick={() => setMode('signup')}>Apply for Access →</button>
              <button style={navBtnStyle} onClick={() => setMode('login')}>Sign In</button>
            </div>
          </div>

          {/* live KPI panel */}
          <div style={{ background: 'var(--navy-900)', border: '1px solid var(--border-hi)', borderRadius: 16, padding: 32, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-dim)' }}>LIVE · FARM OVERVIEW</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--green)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'blink 1.4s ease infinite' }} />
                STREAMING
              </span>
            </div>
            {[
              { label: 'FCR (Feed Conversion Ratio)', value: '1.72', target: '< 1.80', spark: [1.90,1.87,1.83,1.79,1.75,1.72], color: 'var(--green)', good: true },
              { label: 'Mortality Rate Δ (7-day)', value: '2.1%', target: '< 3.5%', spark: [2.8,2.6,2.4,2.3,2.2,2.1], color: 'var(--cyan)', good: true },
              { label: 'Flock Uniformity (CV)', value: '6.4%', target: '< 8%', spark: [9.1,8.4,7.8,7.2,6.8,6.4], color: 'var(--blue-400)', good: true },
              { label: 'Avg Weight vs Projection', value: '+3.2%', target: 'Regression Δ', spark: [0,0.8,1.4,2.1,2.7,3.2], color: 'var(--gold)', good: true },
            ].map(k => (
              <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{k.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>TARGET {k.target}</span>
                  </div>
                </div>
                <Sparkline data={k.spark} color={k.color} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULA ENGINE SECTION */}
      <section style={{ padding: '80px 48px', background: 'var(--navy-900)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' as const, gap: 16 }}>
            <div>
              <p className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 12 }}>MATHEMATICAL ENGINE</p>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800 }}>Every metric is a formula,<br />not a guess</h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-mid)', maxWidth: 380, lineHeight: 1.8 }}>
              SPD derives every KPI from validated quantitative models. No black boxes. Every number traces back to an equation.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 20 }}>
            <FormulaCard
              label="Feed Conversion Ratio"
              formula="FCR = ΣΔm_feed / ΣΔm_bird"
              desc="Cumulative feed consumed divided by cumulative live weight gain. Optimised daily via least-squares regression on intake vs. growth curves." />
            <FormulaCard
              label="Mortality Risk (Poisson)"
              formula="P(k,t) = (λt)^k · e^(−λt) / k!"
              desc="Arrival rate λ is calibrated from your historical mortality data and regional disease incidence. Alerts fire when P(k≥1) > 0.15 over 48 h." />
            <FormulaCard
              label="Break-Even Volume"
              formula="Q* = FC / (P − VC)"
              desc="Fixed costs divided by the margin per bird. SPD recalculates Q* daily as feed prices and market rates update, giving you a live break-even target." />
            <FormulaCard
              label="Flock Uniformity (CV)"
              formula="CV = (σ_weight / μ_weight) × 100"
              desc="Coefficient of variation on sampled weights. CV > 10% triggers a non-uniform flock alert and initiates pen separation recommendations." />
            <FormulaCard
              label="Hen-Day Production"
              formula="HD% = (eggs_day / hens_alive) × 100"
              desc="Daily egg production normalised to surviving hens. SPD fits a Wood lactation curve to your HD% time series and flags deviations > 1.5σ." />
            <FormulaCard
              label="ROI per Cycle"
              formula="ROI = (Revenue − Cost) / Cost × 100"
              desc="Full-cycle return on investment with cost disaggregated into feed (≈70%), chick, medication, labour, and overhead. Scenario-tested across market price ranges." />
            <FormulaCard
              label="Growth Projection"
              formula="W(t) = W∞ · (1 − e^(−k(t−t₀)))"
              desc="Von Bertalanffy growth model fitted via nonlinear least squares to your flock's weight records. Deviations from the fitted curve trigger early warnings." />
            <FormulaCard
              label="Outbreak Detection"
              formula="CUSUM_t = max(0, CUSUM_{t-1} + x_t − μ − k)"
              desc="CUSUM control chart on mortality rate. Detects sustained upward shifts (potential outbreaks) 24–48 h before they become visible to the naked eye." />
            <FormulaCard
              label="Profit Sensitivity"
              formula="∂π/∂FC = −1   ∂π/∂P = Q"
              desc="Partial derivatives of the profit function expose your biggest levers. Feed cost is always the dominant variable — SPD quantifies exactly how much a 1% price shift costs you." />
          </div>
        </div>
      </section>

      {/* METRICS STRIP */}
      <section style={{ padding: '64px 48px' }} className="grid-bg">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 2, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Avg Annual Savings', to: 9000, prefix: '$', suffix: '', decimals: 0 },
              { label: 'Uptime SLA', to: 99.2, prefix: '', suffix: '%', decimals: 1 },
              { label: 'Detection Lead Time', to: 48, prefix: '', suffix: 'h', decimals: 0 },
              { label: 'Beta Farm Retention', to: 89, prefix: '', suffix: '%', decimals: 0 },
              { label: 'Farmer Rating', to: 4.7, prefix: '', suffix: '/5', decimals: 1 },
            ].map((m, i) => (
              <div key={m.label} style={{ background: i % 2 === 0 ? 'var(--navy-900)' : 'var(--navy-800)', padding: '40px 32px', textAlign: 'center' as const }}>
                <div className="mono" style={{ fontSize: 40, fontWeight: 700, color: 'var(--blue-400)', marginBottom: 8 }}>
                  <Counter to={m.to} prefix={m.prefix} suffix={m.suffix} decimals={m.decimals} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREDICTIVE INTELLIGENCE */}
      <section style={{ padding: '80px 48px', background: 'var(--navy-900)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 16, textAlign: 'center' as const }}>PREDICTIVE INTELLIGENCE PIPELINE</p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, textAlign: 'center' as const, marginBottom: 64 }}>From raw data to decision in seconds</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { step: '01', icon: '⬇', title: 'Data Ingestion', body: 'Daily weights, feed intake, egg counts, mortality, medication — entered via mobile, synced to Neon PostgreSQL with timestamp integrity checks.' },
              { step: '02', icon: '∑', title: 'Statistical Engine', body: 'Regression models, CUSUM charts, CV analysis and Von Bertalanffy growth curves run server-side on each new data point.' },
              { step: '03', icon: '◈', title: 'Anomaly Detection', body: 'Z-score and CUSUM thresholds flag deviations from fitted baselines. Outbreak Poisson model updates its λ parameter with each mortality event.' },
              { step: '04', icon: '⚡', title: 'Actionable Alert', body: 'You receive a quantified alert: not "mortality is high" but "mortality rate Δ = +0.8% over 48 h — P(outbreak) = 23%". Numbers, not noise.' },
            ].map(s => (
              <div key={s.step} style={{ background: 'var(--navy-900)', padding: '40px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--blue-400)', letterSpacing: '0.1em' }}>STEP {s.step}</span>
                  <span style={{ fontSize: 24, marginLeft: 'auto' }}>{s.icon}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.8 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKET + PROBLEM */}
      <section style={{ padding: '80px 48px' }} className="grid-bg">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 16 }}>THE PROBLEM · QUANTIFIED</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}>The numbers that are costing you</h2>
            {[
              { stat: '15–30%', label: 'of profits lost', desc: 'to preventable mortality and suboptimal FCR — without early detection.' },
              { stat: '$50k+', label: 'per outbreak', desc: 'average financial damage before visual inspection catches it.' },
              { stat: '70%', label: 'still use Excel', desc: 'or paper records — reactive, not predictive, no statistical baseline.' },
              { stat: '48 h', label: 'detection gap', desc: 'the window between problem onset and first visible symptoms. SPD closes it.' },
            ].map(p => (
              <div key={p.stat} style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-400)', minWidth: 80, lineHeight: 1 }}>{p.stat}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.label}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 16 }}>MARKET OPPORTUNITY</p>
            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 32 }}>Addressable market</h2>
            {[
              { label: 'TAM — African Poultry Tech', value: '$2.8B', pct: 100 },
              { label: 'SAM — Southern & East Africa', value: '$450M', pct: 36 },
              { label: 'SOM — SME farms, mobile-first', value: '$18M', pct: 6 },
            ].map(m => (
              <div key={m.label} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>{m.label}</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue-300)' }}>{m.value}</span>
                </div>
                <div style={{ height: 6, background: 'var(--navy-700)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.pct}%`, background: 'linear-gradient(90deg, var(--blue-500), var(--blue-400))', borderRadius: 3 }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 40, background: 'var(--navy-800)', border: '1px solid var(--border-hi)', borderRadius: 12, padding: 28 }}>
              <p className="mono" style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.12em', marginBottom: 16 }}>PRICING MODEL</p>
              <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: 'var(--blue-400)', marginBottom: 8 }}>$125<span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/month</span></div>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7 }}>
                vs. $500+ international competitors. Accepts M-Pesa & EcoCash. Break-even ROI at FCR improvement of just 0.05 units.
              </p>
              <div className="mono" style={{ marginTop: 20, fontSize: 12, color: 'var(--text-dim)' }}>
                ROI payback = $125 / (ΔFCR_savings / cycle) · cycles_per_year
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 48px', textAlign: 'center' as const, background: 'var(--navy-900)', borderTop: '1px solid var(--border)' }}>
        <p className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--cyan)', marginBottom: 20 }}>READY TO QUANTIFY YOUR FARM?</p>
        <h2 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, marginBottom: 20, lineHeight: 1.1 }}>
          Stop guessing.<br />Start measuring.
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.8 }}>
          Every day without a statistical baseline is a day your FCR, mortality rate, and profit margin are operating blind.
        </p>
        <button style={{ ...primaryBtnStyle, fontSize: 16, padding: '16px 48px' }} onClick={() => setMode('signup')}>
          Apply for Access →
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 }}>
        <Logo small />
        <p className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          © 2025 SMART POULTRY DECISIONS · MASERU, LESOTHO
        </p>
        <p className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>info@smartpoultry.pro</p>
      </footer>
    </div>
  )
}

/* ─── shared sub-components ──────────────────────────────── */
function Logo({ small }: { small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: small ? 28 : 36, height: small ? 28 : 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--blue-500), var(--cyan-dim))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? 14 : 18 }}>📊</div>
      <div>
        <p style={{ fontSize: small ? 13 : 15, fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1 }}>SMART POULTRY</p>
        <p className="mono" style={{ fontSize: small ? 9 : 10, color: 'var(--cyan)', letterSpacing: '0.12em', lineHeight: 1.4 }}>DECISIONS · ANALYTICS</p>
      </div>
    </div>
  )
}

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isErr = type === 'error'
  return (
    <div style={{ background: isErr ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${isErr ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: isErr ? '#fca5a5' : '#6ee7b7', marginBottom: 20, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 16 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--navy-800)', border: '1px solid var(--border-hi)', borderRadius: 8,
  padding: '11px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%',
  transition: 'border-color 0.2s',
}

function Input({ onChange, value, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { onChange?: (v: string) => void }) {
  return <input style={inputStyle} {...props} value={value} onChange={e => onChange?.(e.target.value)} />
}

function Select({ onChange, value, children }: { onChange?: (v: string) => void; value: string; children: React.ReactNode }) {
  return (
    <select style={{ ...inputStyle, cursor: 'pointer' }} value={value} onChange={e => onChange?.(e.target.value)}>
      {children}
    </select>
  )
}

function Btn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading} style={{ ...primaryBtnStyle, width: '100%', marginTop: 8, fontSize: 15, padding: '14px', opacity: loading ? 0.7 : 1 }}>
      {children}
    </button>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border-hi)', color: 'var(--text)',
  borderRadius: 8, padding: '9px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'Syne, sans-serif',
}

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--blue-500), var(--navy-600))',
  border: '1px solid var(--blue-400)', color: '#fff',
  borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
  fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '0.02em',
}