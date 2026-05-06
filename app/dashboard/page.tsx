'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface DailyEntry {
  id: string; date: string; day: number; birdsAlive: number
  deathsToday: number; feedKgToday: number; avgWeightKg: number
  waterLitres: number; eggsCollected: number; medicationGiven: string; notes: string
}
interface FlockSetup {
  flockName: string; flockType: string; startDate: string; initialBirds: number
  breedStandard: number; targetSlaughterDay: number
  feedPricePerKg: number; salePricePerKg: number; chickCost: number
}

function computeFCR(e: DailyEntry[], s: FlockSetup) {
  if (e.length < 2) return 0
  const totalFeed = e.reduce((a, x) => a + x.feedKgToday, 0)
  const firstW = e[0].avgWeightKg * e[0].birdsAlive
  const lastW  = e[e.length-1].avgWeightKg * e[e.length-1].birdsAlive
  const gain   = lastW - firstW
  return gain > 0 ? parseFloat((totalFeed / gain).toFixed(4)) : 0
}
function computeMort(e: DailyEntry[], s: FlockSetup) {
  if (!e.length || !s.initialBirds) return 0
  return parseFloat(((e.reduce((a,x)=>a+x.deathsToday,0)/s.initialBirds)*100).toFixed(4))
}
function computeCV(e: DailyEntry[]) {
  const w = e.map(x=>x.avgWeightKg).filter(x=>x>0)
  if (w.length<2) return 0
  const mean = w.reduce((a,x)=>a+x,0)/w.length
  const sd = Math.sqrt(w.reduce((a,x)=>a+Math.pow(x-mean,2),0)/w.length)
  return mean>0 ? parseFloat(((sd/mean)*100).toFixed(4)) : 0
}
function computeHD(e: DailyEntry[]) {
  const we = e.filter(x=>x.eggsCollected>0)
  if (!we.length) return 0
  const eggs = we.reduce((a,x)=>a+x.eggsCollected,0)
  const hd   = we.reduce((a,x)=>a+x.birdsAlive,0)
  return hd>0 ? parseFloat(((eggs/hd)*100).toFixed(2)) : 0
}
function computeCUSUM(e: DailyEntry[], s: FlockSetup, k=0.5) {
  if (!e.length) return { values: [] as number[], mu: 0 }
  const rates = e.map(x => s.initialBirds>0 ? (x.deathsToday/s.initialBirds)*100 : 0)
  const mu = rates.reduce((a,x)=>a+x,0)/rates.length
  let c = 0
  const values = rates.map(r => { c=Math.max(0,c+(r-mu)-k); return parseFloat(c.toFixed(6)) })
  return { values, mu: parseFloat(mu.toFixed(6)) }
}
function fitVB(e: DailyEntry[]) {
  const pts = e.filter(x=>x.day>0&&x.avgWeightKg>0)
  if (pts.length<3) return { Winf:0, k:0, t0:0, r2:0 }
  let Winf=Math.max(...pts.map(x=>x.avgWeightKg))*1.5, k=0.25, t0=-0.5
  const lr=0.00008
  for (let i=0;i<5000;i++) {
    let gW=0,gk=0,gt=0
    for (const p of pts) {
      const ex=Math.exp(-k*(p.day-t0)), pred=Winf*(1-ex), err=pred-p.avgWeightKg
      gW+=2*err*(1-ex); gk+=2*err*Winf*ex*(p.day-t0); gt+=2*err*Winf*ex*(-k)
    }
    Winf-=lr*gW; k-=lr*gk*0.01; t0-=lr*gt*0.01
    Winf=Math.max(Winf,0.1); k=Math.max(k,0.001)
  }
  const mean=pts.reduce((a,p)=>a+p.avgWeightKg,0)/pts.length
  const ssTot=pts.reduce((a,p)=>a+Math.pow(p.avgWeightKg-mean,2),0)
  const ssRes=pts.reduce((a,p)=>a+Math.pow(Winf*(1-Math.exp(-k*(p.day-t0)))-p.avgWeightKg,2),0)
  return { Winf:parseFloat(Winf.toFixed(4)), k:parseFloat(k.toFixed(6)), t0:parseFloat(t0.toFixed(4)), r2:parseFloat(Math.max(0,1-ssRes/ssTot).toFixed(6)) }
}
function vbP(day:number,W:number,k:number,t:number){return W*(1-Math.exp(-k*(day-t)))}
function computeProfit(e: DailyEntry[], s: FlockSetup) {
  if (!e.length||!s.initialBirds) return null
  const latest=e[e.length-1]
  const totalFeed=e.reduce((a,x)=>a+x.feedKgToday,0)
  const totalDeaths=e.reduce((a,x)=>a+x.deathsToday,0)
  const feedCost=totalFeed*s.feedPricePerKg
  const chickCosts=s.initialBirds*s.chickCost
  const revenue=latest.birdsAlive*latest.avgWeightKg*s.salePricePerKg
  const gross=revenue-feedCost-chickCosts
  const roi=(feedCost+chickCosts)>0?(gross/(feedCost+chickCosts))*100:0
  const be=s.salePricePerKg>0&&latest.avgWeightKg>0?Math.ceil((feedCost+chickCosts)/(s.salePricePerKg*latest.avgWeightKg)):0
  return { feedCost:+feedCost.toFixed(2), chickCosts:+chickCosts.toFixed(2), revenue:+revenue.toFixed(2), gross:+gross.toFixed(2), roi:+roi.toFixed(2), be, totalFeedKg:+totalFeed.toFixed(1), totalDeaths, surviving:latest.birdsAlive }
}

function Chart({ series, labels, height=160, yLabel='', refLine }: {
  series:{data:number[];color:string;label:string;dashed?:boolean}[]
  labels:string[]; height?:number; yLabel?:string
  refLine?:{value:number;color:string;label:string}
}) {
  const allV = series.flatMap(s=>s.data).filter(v=>isFinite(v)&&v!==0)
  if (!allV.length) return (
    <div style={{height,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'1px dashed var(--border)',borderRadius:8,gap:8}}>
      <span style={{fontSize:28,opacity:0.2}}>📊</span>
      <span style={{fontSize:12,color:'var(--text-dim)'}}>No data yet — save entries to see this chart</span>
    </div>
  )
  const PL=40,PR=8,PT=8,PB=22,W=500,H=height,iW=W-PL-PR,iH=H-PT-PB
  const minV=refLine?Math.min(...allV,refLine.value):Math.min(...allV)
  const maxV=refLine?Math.max(...allV,refLine.value):Math.max(...allV)
  const range=maxV-minV||1
  const maxLen=Math.max(...series.map(s=>s.data.length),1)
  const tx=(i:number)=>PL+(maxLen<2?iW/2:(i/(maxLen-1))*iW)
  const ty=(v:number)=>PT+iH-((v-minV)/range)*iH
  const ticks=4
  return (
    <div>
      {yLabel&&<p style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--text-dim)',marginBottom:4}}>{yLabel}</p>}
      <div style={{display:'flex',gap:14,marginBottom:6,flexWrap:'wrap'}}>
        {series.map(s=>(
          <span key={s.label} style={{fontFamily:'Space Mono,monospace',fontSize:9,color:s.color,display:'flex',alignItems:'center',gap:4}}>
            <svg width={18} height={6}><line x1={0} y1={3} x2={18} y2={3} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed?'3,2':undefined}/></svg>
            {s.label}
          </span>
        ))}
        {refLine&&<span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:refLine.color,display:'flex',alignItems:'center',gap:4}}>
          <svg width={18} height={6}><line x1={0} y1={3} x2={18} y2={3} stroke={refLine.color} strokeWidth={1.5} strokeDasharray="4,2"/></svg>
          {refLine.label}
        </span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height,display:'block'}}>
        {Array.from({length:ticks+1}).map((_,i)=>{
          const v=minV+(range/ticks)*i, y=ty(v)
          return <g key={i}>
            <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="rgba(59,130,246,0.07)" strokeWidth={1}/>
            <text x={PL-3} y={y+3} textAnchor="end" fontSize={7} fill="var(--text-dim)" fontFamily="Space Mono,monospace">
              {Math.abs(v)<0.001?v.toFixed(5):Math.abs(v)<0.1?v.toFixed(3):Math.abs(v)<10?v.toFixed(2):v.toFixed(0)}
            </text>
          </g>
        })}
        {refLine&&<line x1={PL} y1={ty(refLine.value)} x2={W-PR} y2={ty(refLine.value)} stroke={refLine.color} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.7}/>}
        {series.map(s=>{
          if (!s.data.length) return null
          const pts=s.data.map((v,i)=>[tx(i),ty(v)] as [number,number])
          const d=pts.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
          return <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed?'5,3':undefined}/>
            {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={s.color}/>)}
          </g>
        })}
        {labels.map((l,i)=>{
          const step=Math.max(1,Math.floor(labels.length/6))
          if(i%step!==0&&i!==labels.length-1) return null
          return <text key={i} x={tx(i)} y={H-4} textAnchor="middle" fontSize={7} fill="var(--text-dim)" fontFamily="Space Mono,monospace">{l}</text>
        })}
      </svg>
    </div>
  )
}

function KPI({label,formula,value,unit,target,ok,color,sub}:{label:string;formula:string;value:string;unit:string;target:string;ok:boolean|null;color:string;sub?:string}) {
  return (
    <div style={{background:'var(--navy-900)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:color}}/>
      <p style={{fontSize:10,color:'var(--text-dim)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>{label}</p>
      <p style={{fontFamily:'Space Mono,monospace',fontSize:9,color:color,marginBottom:10,opacity:0.75,wordBreak:'break-word'}}>{formula}</p>
      <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
        <span style={{fontFamily:'Space Mono,monospace',fontSize:26,fontWeight:700,color:value==='—'?'var(--text-dim)':color,lineHeight:1}}>{value}</span>
        <span style={{fontSize:12,color:'var(--text-dim)'}}>{unit}</span>
      </div>
      {sub&&<p style={{fontSize:11,color:'var(--text-mid)',marginBottom:4}}>{sub}</p>}
      <p style={{fontSize:11,color:ok===null?'var(--text-dim)':ok?'#10b981':'#ef4444'}}>{ok===null?'○':ok?'✓':'✗'} TARGET {target}</p>
    </div>
  )
}

function Panel({title,mono,children}:{title:string;mono?:string;children:React.ReactNode}) {
  return (
    <div style={{background:'var(--navy-900)',border:'1px solid var(--border)',borderRadius:12,padding:'22px 24px'}}>
      <p style={{fontSize:14,fontWeight:700,marginBottom:mono?2:14}}>{title}</p>
      {mono&&<p style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'var(--cyan)',letterSpacing:'0.08em',marginBottom:14}}>{mono}</p>}
      {children}
    </div>
  )
}

function FF({label,hint,children,span}:{label:string;hint?:string;children:React.ReactNode;span?:boolean}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5,gridColumn:span?'span 2':undefined}}>
      <label style={{fontSize:10,fontWeight:700,color:'var(--text-dim)',letterSpacing:'0.1em',textTransform:'uppercase'}}>{label}</label>
      {children}
      {hint&&<span style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'var(--text-dim)'}}>{hint}</span>}
    </div>
  )
}

const IS:React.CSSProperties={background:'var(--navy-800)',border:'1px solid var(--border-hi)',borderRadius:7,padding:'9px 12px',color:'var(--text)',fontSize:13,outline:'none',width:'100%',fontFamily:'Syne,sans-serif'}

function AlertBanner({cusums,h=5}:{cusums:number[];h?:number}) {
  if (!cusums.length) return null
  const latest=cusums[cusums.length-1]
  const fired=latest>=h, warn=latest>=h*0.6&&!fired
  if (!fired&&!warn) return null
  const c=fired?{bg:'rgba(239,68,68,0.07)',bdr:'rgba(239,68,68,0.3)',tx:'#fca5a5'}:{bg:'rgba(245,158,11,0.07)',bdr:'rgba(245,158,11,0.3)',tx:'#fcd34d'}
  return (
    <div style={{background:c.bg,border:`1px solid ${c.bdr}`,borderRadius:12,padding:'14px 20px',marginBottom:20,display:'flex',gap:12}}>
      <span style={{fontSize:18}}>{fired?'🚨':'⚠️'}</span>
      <div>
        <p style={{fontFamily:'Space Mono,monospace',fontSize:10,color:c.tx,letterSpacing:'0.1em',marginBottom:4}}>CUSUM — {fired?'CONTROL LIMIT BREACHED':'APPROACHING LIMIT'}</p>
        <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.6}}>{fired?`C_t = ${latest.toFixed(4)} ≥ h = ${h}. Sustained mortality shift detected. Veterinary assessment recommended.`:`C_t = ${latest.toFixed(4)} approaching h = ${h}. Monitor closely.`}</p>
      </div>
    </div>
  )
}

function Empty({onGo}:{onGo:()=>void}) {
  return (
    <div style={{border:'1px dashed var(--border)',borderRadius:12,padding:'60px',textAlign:'center'}}>
      <p style={{fontSize:28,marginBottom:12,opacity:0.25}}>📊</p>
      <p style={{fontSize:14,color:'var(--text-dim)',marginBottom:16}}>No observations yet.</p>
      <button onClick={onGo} style={{background:'linear-gradient(135deg,var(--blue-500),var(--navy-600))',border:'1px solid var(--blue-400)',color:'#fff',borderRadius:8,padding:'9px 22px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>Enter Data →</button>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [tab,setTab] = useState<'setup'|'entry'|'overview'|'growth'|'cusum'|'profit'>('setup')
  const [entries,setEntries] = useState<DailyEntry[]>([])
  const [setup,setSetup] = useState<FlockSetup>({flockName:'',flockType:'',startDate:'',initialBirds:0,breedStandard:1.80,targetSlaughterDay:35,feedPricePerKg:0,salePricePerKg:0,chickCost:0})
  const [setupSaved,setSetupSaved] = useState(false)
  const [ef,setEf] = useState({date:'',day:'',birdsAlive:'',deathsToday:'',feedKgToday:'',avgWeightKg:'',waterLitres:'',eggsCollected:'',medicationGiven:'',notes:''})
  const [entryErr,setEntryErr] = useState('')
  const [entrySaved,setEntrySaved] = useState(false)
  const [editId,setEditId] = useState<string|null>(null)

  const sorted=[...entries].sort((a,b)=>a.day-b.day)
  const labels=sorted.map(e=>`D${e.day}`)
  const fcr=computeFCR(sorted,setup)
  const mort=computeMort(sorted,setup)
  const cv=computeCV(sorted)
  const hd=computeHD(sorted)
  const {values:cusums,mu:cuMu}=computeCUSUM(sorted,setup)
  const vb=fitVB(sorted)
  const profit=computeProfit(sorted,setup)
  const ready=setup.initialBirds>0&&setup.flockType!==''

  async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.push('/')}

  function saveSetup(e:React.FormEvent){
    e.preventDefault()
    setSetupSaved(true)
    setTab('entry')
    setTimeout(()=>setSetupSaved(false),2000)
  }

  function resetForm(){setEf({date:'',day:'',birdsAlive:'',deathsToday:'',feedKgToday:'',avgWeightKg:'',waterLitres:'',eggsCollected:'',medicationGiven:'',notes:''});setEditId(null)}

  function editEntry(entry:DailyEntry){
    setEf({date:entry.date,day:String(entry.day),birdsAlive:String(entry.birdsAlive),deathsToday:String(entry.deathsToday),feedKgToday:String(entry.feedKgToday),avgWeightKg:String(entry.avgWeightKg),waterLitres:String(entry.waterLitres),eggsCollected:String(entry.eggsCollected),medicationGiven:entry.medicationGiven,notes:entry.notes})
    setEditId(entry.id)
    setTab('entry')
  }

  function saveEntry(e:React.FormEvent){
    e.preventDefault(); setEntryErr('')
    const day=parseInt(ef.day), ba=parseInt(ef.birdsAlive), dt=parseInt(ef.deathsToday)
    const fk=parseFloat(ef.feedKgToday), aw=parseFloat(ef.avgWeightKg)
    const wl=parseFloat(ef.waterLitres)||0, ec=parseInt(ef.eggsCollected)||0
    if(!ef.date) return setEntryErr('Date required.')
    if(isNaN(day)||day<1) return setEntryErr('Day must be a positive integer.')
    if(isNaN(ba)||ba<0) return setEntryErr('Birds alive must be non-negative.')
    if(isNaN(dt)||dt<0) return setEntryErr('Deaths must be non-negative.')
    if(dt>ba) return setEntryErr('Deaths cannot exceed birds alive.')
    if(isNaN(fk)||fk<0) return setEntryErr('Feed must be non-negative.')
    if(isNaN(aw)||aw<=0) return setEntryErr('Average weight must be > 0.')
    if(setup.initialBirds>0&&ba>setup.initialBirds) return setEntryErr(`Birds alive (${ba}) exceeds initial flock (${setup.initialBirds}).`)
    const newE:DailyEntry={id:editId||`${day}-${Date.now()}`,date:ef.date,day,birdsAlive:ba,deathsToday:dt,feedKgToday:fk,avgWeightKg:aw,waterLitres:wl,eggsCollected:ec,medicationGiven:ef.medicationGiven,notes:ef.notes}
    setEntries(prev=>[...(editId?prev.filter(x=>x.id!==editId):prev.filter(x=>x.day!==day)),newE].sort((a,b)=>a.day-b.day))
    resetForm()
    setEntrySaved(true)
    setTimeout(()=>setEntrySaved(false),2500)
  }

  const TABS=[{id:'setup',label:'⚙ Setup'},{id:'entry',label:'✎ Enter Data'},{id:'overview',label:'◈ Overview'},{id:'growth',label:'∿ Growth'},{id:'cusum',label:'⚡ CUSUM'},{id:'profit',label:'$ Profit'}] as const

  return (
    <div style={{minHeight:'100vh',background:'var(--ink)'}}>
      <header style={{position:'sticky',top:0,zIndex:50,borderBottom:'1px solid var(--border)',background:'rgba(2,12,31,0.97)',backdropFilter:'blur(16px)'}}>
        <div style={{maxWidth:1300,margin:'0 auto',padding:'0 24px',height:54,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <span style={{fontWeight:800,fontSize:15}}>SPD</span>
            <div style={{width:1,height:16,background:'var(--border)'}}/>
            <div style={{display:'flex',gap:2}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',padding:'6px 10px',fontSize:12,cursor:'pointer',fontFamily:'Syne,sans-serif',fontWeight:tab===t.id?700:400,color:tab===t.id?'var(--blue-300)':'var(--text-dim)',borderBottom:`2px solid ${tab===t.id?'var(--blue-400)':'transparent'}`,borderRadius:0}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {setup.flockName&&<span style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--cyan)'}}>{setup.flockName} · {entries.length} entries</span>}
            <button onClick={logout} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text-dim)',borderRadius:6,padding:'5px 14px',fontSize:12,cursor:'pointer'}}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={{padding:'28px',maxWidth:1300,margin:'0 auto'}}>

        {/* SETUP */}
        {tab==='setup'&&(
          <div style={{maxWidth:660}}>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>FLOCK CONFIGURATION</p>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>Set Up Your Flock</h1>
            <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,marginBottom:24}}>These values drive every calculation. Set them before entering daily data. You can return here to update prices.</p>
            {setupSaved&&<div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:8,padding:'10px 16px',fontSize:12,color:'#6ee7b7',marginBottom:16,fontFamily:'Space Mono,monospace'}}>✓ SAVED — GOING TO DATA ENTRY</div>}
            <form onSubmit={saveSetup} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <FF label="Flock / Batch Name *"><input style={IS} required placeholder="Batch 7 — May 2025" value={setup.flockName} onChange={e=>setSetup(p=>({...p,flockName:e.target.value}))}/></FF>
              <FF label="Flock Type *"><select style={IS} required value={setup.flockType} onChange={e=>setSetup(p=>({...p,flockType:e.target.value}))}><option value="">Select</option><option value="broiler">Broiler</option><option value="layer">Layer</option><option value="breeder">Breeder</option></select></FF>
              <FF label="Placement Date *" hint="day chicks/pullets arrived"><input type="date" style={IS} required value={setup.startDate} onChange={e=>setSetup(p=>({...p,startDate:e.target.value}))}/></FF>
              <FF label="Initial Bird Count *" hint="birds placed on day 1"><input type="number" style={IS} required min={1} placeholder="5000" value={setup.initialBirds||''} onChange={e=>setSetup(p=>({...p,initialBirds:parseInt(e.target.value)||0}))}/></FF>
              <FF label="Breed Standard FCR" hint="target FCR e.g. 1.75 for Ross 308"><input type="number" style={IS} step="0.01" min={0.5} max={5} placeholder="1.75" value={setup.breedStandard||''} onChange={e=>setSetup(p=>({...p,breedStandard:parseFloat(e.target.value)||1.80}))}/></FF>
              <FF label="Target Slaughter Day"><input type="number" style={IS} min={1} placeholder="35" value={setup.targetSlaughterDay||''} onChange={e=>setSetup(p=>({...p,targetSlaughterDay:parseInt(e.target.value)||35}))}/></FF>
              <FF label="Feed Price / kg" hint="in your local currency"><input type="number" style={IS} step="0.01" min={0} placeholder="18.50" value={setup.feedPricePerKg||''} onChange={e=>setSetup(p=>({...p,feedPricePerKg:parseFloat(e.target.value)||0}))}/></FF>
              <FF label="Sale Price / kg live weight"><input type="number" style={IS} step="0.01" min={0} placeholder="28.00" value={setup.salePricePerKg||''} onChange={e=>setSetup(p=>({...p,salePricePerKg:parseFloat(e.target.value)||0}))}/></FF>
              <FF label="Chick Cost / bird" hint="day-old chick purchase price"><input type="number" style={IS} step="0.01" min={0} placeholder="12.00" value={setup.chickCost||''} onChange={e=>setSetup(p=>({...p,chickCost:parseFloat(e.target.value)||0}))}/></FF>
              <div style={{gridColumn:'span 2',marginTop:4}}>
                <button type="submit" style={{background:'linear-gradient(135deg,var(--blue-500),var(--navy-600))',border:'1px solid var(--blue-400)',color:'#fff',borderRadius:8,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>Save Setup → Enter Data</button>
              </div>
            </form>
          </div>
        )}

        {/* ENTRY */}
        {tab==='entry'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:28,alignItems:'start'}}>
            <div>
              <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>{editId?'EDITING ENTRY':'NEW OBSERVATION'}</p>
              <h2 style={{fontSize:22,fontWeight:800,marginBottom:20}}>{editId?'Edit Entry':'Log Daily Data'}</h2>
              {!ready&&<div style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#fcd34d',marginBottom:16}}>⚠ Complete Setup first. <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={()=>setTab('setup')}>Go to Setup →</span></div>}
              {entryErr&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#fca5a5',marginBottom:14}}>{entryErr}</div>}
              {entrySaved&&<div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#6ee7b7',marginBottom:14,fontFamily:'Space Mono,monospace'}}>✓ SAVED · ALL METRICS RECALCULATED</div>}
              <form onSubmit={saveEntry} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <FF label="Date *"><input type="date" style={IS} required value={ef.date} onChange={e=>setEf(p=>({...p,date:e.target.value}))}/></FF>
                <FF label="Cycle Day *" hint="day 1 = placement"><input type="number" style={IS} required min={1} placeholder="14" value={ef.day} onChange={e=>setEf(p=>({...p,day:e.target.value}))}/></FF>
                <FF label="Birds Alive *" hint="headcount end of day"><input type="number" style={IS} required min={0} placeholder="4980" value={ef.birdsAlive} onChange={e=>setEf(p=>({...p,birdsAlive:e.target.value}))}/></FF>
                <FF label="Deaths Today *" hint="found dead today only"><input type="number" style={IS} required min={0} placeholder="3" value={ef.deathsToday} onChange={e=>setEf(p=>({...p,deathsToday:e.target.value}))}/></FF>
                <FF label="Feed Consumed (kg) *" hint="total kg fed today"><input type="number" style={IS} required min={0} step="0.1" placeholder="420" value={ef.feedKgToday} onChange={e=>setEf(p=>({...p,feedKgToday:e.target.value}))}/></FF>
                <FF label="Avg Body Weight (kg) *" hint="sampled mean live weight"><input type="number" style={IS} required min={0.001} step="0.001" placeholder="1.420" value={ef.avgWeightKg} onChange={e=>setEf(p=>({...p,avgWeightKg:e.target.value}))}/></FF>
                <FF label="Water (litres)" hint="total water today"><input type="number" style={IS} min={0} step="1" placeholder="850" value={ef.waterLitres} onChange={e=>setEf(p=>({...p,waterLitres:e.target.value}))}/></FF>
                <FF label="Eggs Collected" hint="layers only — 0 for broilers"><input type="number" style={IS} min={0} placeholder="0" value={ef.eggsCollected} onChange={e=>setEf(p=>({...p,eggsCollected:e.target.value}))}/></FF>
                <FF label="Medication" hint="name + dose or 'none'" span><input style={IS} placeholder="Amprolium 1g/L water" value={ef.medicationGiven} onChange={e=>setEf(p=>({...p,medicationGiven:e.target.value}))}/></FF>
                <FF label="Notes" hint="behaviour, weather, abnormalities" span><textarea style={{...IS,resize:'vertical',minHeight:56}} placeholder="e.g. sneezing observed in pen 3" value={ef.notes} onChange={e=>setEf(p=>({...p,notes:e.target.value}))}/></FF>
                <div style={{gridColumn:'span 2',display:'flex',gap:10,marginTop:4}}>
                  <button type="submit" style={{background:'linear-gradient(135deg,var(--blue-500),var(--navy-600))',border:'1px solid var(--blue-400)',color:'#fff',borderRadius:8,padding:'11px 24px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>{editId?'Update Entry':'Save → Recalculate'}</button>
                  {editId&&<button type="button" onClick={resetForm} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text-dim)',borderRadius:8,padding:'11px 18px',fontSize:13,cursor:'pointer'}}>Cancel</button>}
                </div>
              </form>
            </div>
            <div>
              <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--text-dim)',letterSpacing:'0.1em',marginBottom:12}}>OBSERVATION LOG · {entries.length} ENTRIES</p>
              {!entries.length?(
                <div style={{border:'1px dashed var(--border)',borderRadius:10,padding:'40px',textAlign:'center',color:'var(--text-dim)',fontSize:13}}>No entries yet.</div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:620,overflowY:'auto'}}>
                  {sorted.map(e=>(
                    <div key={e.id} style={{background:'var(--navy-900)',border:'1px solid var(--border)',borderRadius:9,padding:'12px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <div style={{display:'flex',gap:10,alignItems:'center'}}>
                          <span style={{fontFamily:'Space Mono,monospace',fontSize:13,fontWeight:700,color:'var(--blue-300)'}}>Day {e.day}</span>
                          <span style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--text-dim)'}}>{e.date}</span>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>editEntry(e)} style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text-dim)',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>Edit</button>
                          <button onClick={()=>setEntries(p=>p.filter(x=>x.id!==e.id))} style={{background:'transparent',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',borderRadius:5,padding:'2px 10px',fontSize:11,cursor:'pointer'}}>✕</button>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                        {[{l:'Birds',v:e.birdsAlive.toLocaleString()},{l:'Deaths',v:String(e.deathsToday),w:e.deathsToday>5},{l:'Feed kg',v:String(e.feedKgToday)},{l:'Avg Wt',v:`${e.avgWeightKg} kg`},{l:'Water L',v:e.waterLitres?String(e.waterLitres):'—'},{l:'Eggs',v:e.eggsCollected?String(e.eggsCollected):'—'}].map(r=>(
                          <div key={r.l}>
                            <p style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'var(--text-dim)',marginBottom:2}}>{r.l}</p>
                            <p style={{fontFamily:'Space Mono,monospace',fontSize:12,color:(r as any).w?'#fca5a5':'var(--text)'}}>{r.v}</p>
                          </div>
                        ))}
                      </div>
                      {e.medicationGiven&&<p style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'#fcd34d',marginTop:8}}>💊 {e.medicationGiven}</p>}
                      {e.notes&&<p style={{fontSize:11,color:'var(--text-dim)',marginTop:6,fontStyle:'italic'}}>{e.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OVERVIEW */}
        {tab==='overview'&&(
          <div>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>FLOCK ANALYTICS</p>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:20}}>Performance Overview</h1>
            {!entries.length?<Empty onGo={()=>setTab('entry')}/>:(
              <>
                <AlertBanner cusums={cusums}/>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:20}}>
                  <KPI label="Feed Conversion Ratio" formula="Σfeed_kg / Σ(birds × Δweight)" value={fcr>0?fcr.toFixed(4):'—'} unit="" target={`< ${setup.breedStandard}`} ok={fcr>0?fcr<setup.breedStandard:null} color="var(--cyan)" sub={`Breed std: ${setup.breedStandard}`}/>
                  <KPI label="Cumulative Mortality" formula="(Σdeaths / initial_n) × 100" value={mort>0?mort.toFixed(4):'—'} unit="%" target="< 5%" ok={mort>0?mort<5:null} color="#ef4444" sub={`${sorted.reduce((a,e)=>a+e.deathsToday,0)} total deaths`}/>
                  <KPI label="Flock Uniformity CV" formula="(σ_weight / μ_weight) × 100" value={cv>0?cv.toFixed(4):'—'} unit="%" target="< 8%" ok={cv>0?cv<8:null} color="var(--blue-400)"/>
                  {setup.flockType==='layer'&&<KPI label="Hen-Day %" formula="Σeggs / Σ(hens·days) × 100" value={hd>0?hd.toFixed(2):'—'} unit="%" target="> 85%" ok={hd>0?hd>85:null} color="var(--gold)"/>}
                  <KPI label="CUSUM C_t" formula="max(0, C_{t-1} + x_t − μ − k)" value={cusums.length?cusums[cusums.length-1].toFixed(4):'—'} unit="" target="< 5.0" ok={cusums.length?cusums[cusums.length-1]<5:null} color="var(--gold)" sub={`μ = ${cuMu.toFixed(4)}%`}/>
                  {profit&&<KPI label="Gross Profit" formula="Revenue − FeedCost − ChickCost" value={profit.gross.toLocaleString()} unit="" target="> 0" ok={profit.gross>0} color="#10b981" sub={`ROI: ${profit.roi.toFixed(1)}%`}/>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <Panel title="Average Body Weight" mono="sampled mean kg per entry"><Chart series={[{data:sorted.map(e=>e.avgWeightKg),color:'var(--cyan)',label:'Avg weight (kg)'}]} labels={labels} height={150} yLabel="kg"/></Panel>
                  <Panel title="Daily Feed Consumed" mono="kg per observation period"><Chart series={[{data:sorted.map(e=>e.feedKgToday),color:'var(--blue-400)',label:'Feed (kg)'}]} labels={labels} height={150} yLabel="kg"/></Panel>
                  <Panel title="Daily Deaths" mono="mortality count per entry"><Chart series={[{data:sorted.map(e=>e.deathsToday),color:'#ef4444',label:'Deaths'}]} labels={labels} height={150} yLabel="birds"/></Panel>
                  <Panel title="Birds Alive" mono="surviving flock headcount"><Chart series={[{data:sorted.map(e=>e.birdsAlive),color:'#10b981',label:'Birds alive'}]} labels={labels} height={150} yLabel="birds"/></Panel>
                  {setup.flockType==='layer'&&<Panel title="Daily Eggs" mono="eggs collected per entry"><Chart series={[{data:sorted.map(e=>e.eggsCollected),color:'var(--gold)',label:'Eggs'}]} labels={labels} height={150} yLabel="eggs"/></Panel>}
                  {sorted.some(e=>e.waterLitres>0)&&<Panel title="Water Consumption" mono="litres per day"><Chart series={[{data:sorted.map(e=>e.waterLitres),color:'#a78bfa',label:'Water (L)'}]} labels={labels} height={150} yLabel="L"/></Panel>}
                </div>
              </>
            )}
          </div>
        )}

        {/* GROWTH */}
        {tab==='growth'&&(
          <div>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>VON BERTALANFFY MODEL</p>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>Growth Projection</h1>
            <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,marginBottom:20,maxWidth:560}}>W∞, k, t₀ fitted via gradient descent on your weight entries. Minimum 3 observations required. Higher R² = better fit.</p>
            {entries.length<3?(
              <div style={{border:'1px dashed var(--border)',borderRadius:10,padding:'48px',textAlign:'center'}}>
                <p style={{fontSize:14,color:'var(--text-dim)',marginBottom:8}}>Need ≥ 3 weight observations to fit the model. Current: {entries.length}</p>
                <button onClick={()=>setTab('entry')} style={{background:'transparent',border:'1px solid var(--border-hi)',color:'var(--blue-300)',borderRadius:7,padding:'8px 20px',fontSize:13,cursor:'pointer',marginTop:8}}>Enter Data →</button>
              </div>
            ):(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:20}}>
                  {[{l:'W∞',v:`${vb.Winf} kg`,c:'var(--blue-400)',d:'Asymptotic weight'},{l:'k',v:String(vb.k),c:'var(--cyan)',d:'Growth rate (day⁻¹)'},{l:'t₀',v:String(vb.t0),c:'var(--gold)',d:'Time offset'},{l:'R²',v:vb.r2.toFixed(6),c:vb.r2>0.97?'#10b981':vb.r2>0.90?'#f59e0b':'#ef4444',d:vb.r2>0.97?'Excellent':vb.r2>0.90?'Good':'Add more data'}].map(p=>(
                    <div key={p.l} style={{background:'var(--navy-900)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px'}}>
                      <p style={{fontSize:10,color:'var(--text-dim)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{p.l}</p>
                      <p style={{fontFamily:'Space Mono,monospace',fontSize:20,fontWeight:700,color:p.c,marginBottom:4}}>{p.v}</p>
                      <p style={{fontSize:11,color:'var(--text-dim)'}}>{p.d}</p>
                    </div>
                  ))}
                </div>
                <div style={{background:'var(--navy-800)',borderRadius:9,padding:'14px 18px',marginBottom:16}}>
                  <code style={{fontFamily:'Space Mono,monospace',fontSize:13,color:'var(--blue-200)'}}>W(t) = {vb.Winf} × (1 − e^(−{vb.k} × (t − ({vb.t0}))))</code>
                </div>
                <Panel title="Actual vs Projected Weight" mono="W(t) = W∞ · (1 − e^(−k·(t−t₀)))">
                  {(()=>{
                    const days=Array.from({length:setup.targetSlaughterDay+14},(_,i)=>i+1)
                    const proj=days.map(d=>parseFloat(vbP(d,vb.Winf,vb.k,vb.t0).toFixed(4)))
                    const act=days.map(d=>{const e=sorted.find(x=>x.day===d);return e?e.avgWeightKg:0})
                    return <Chart series={[{data:act,color:'var(--cyan)',label:'Actual (kg)'},{data:proj,color:'var(--blue-400)',label:'VB Projected (kg)',dashed:true}]} labels={days.map(d=>`D${d}`)} height={200} yLabel="kg"/>
                  })()}
                </Panel>
                <div style={{marginTop:14}}>
                  <Panel title="Projected Milestones" mono="W(t) at key days">
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}}>
                      {[14,21,28,35,42,setup.targetSlaughterDay].filter((d,i,a)=>a.indexOf(d)===i).map(d=>{
                        const p=vbP(d,vb.Winf,vb.k,vb.t0)
                        const act=sorted.find(e=>e.day===d)
                        const diff=act?act.avgWeightKg-p:null
                        return <div key={d} style={{background:'var(--navy-800)',borderRadius:8,padding:'12px'}}>
                          <p style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--text-dim)',marginBottom:4}}>Day {d}{d===setup.targetSlaughterDay?' ★':''}</p>
                          <p style={{fontFamily:'Space Mono,monospace',fontSize:17,color:'var(--blue-300)',fontWeight:700}}>{p.toFixed(3)} kg</p>
                          {act&&<p style={{fontFamily:'Space Mono,monospace',fontSize:10,marginTop:4,color:Math.abs(diff!)<0.05?'#10b981':'#f59e0b'}}>actual: {act.avgWeightKg} ({diff!>=0?'+':''}{diff!.toFixed(3)})</p>}
                        </div>
                      })}
                    </div>
                  </Panel>
                </div>
              </>
            )}
          </div>
        )}

        {/* CUSUM */}
        {tab==='cusum'&&(
          <div>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>CUMULATIVE SUM CONTROL CHART</p>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>Outbreak Detection</h1>
            <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,marginBottom:20,maxWidth:560}}>Computed fresh from every entry. Detects sustained mortality shifts 24–48 h before visual symptoms. Resets to 0 when rate returns to baseline.</p>
            {!entries.length?<Empty onGo={()=>setTab('entry')}/>:(
              <>
                <AlertBanner cusums={cusums}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                  <Panel title="CUSUM Statistic C_t" mono="C_t = max(0, C_{t-1} + x_t − μ − k)">
                    <Chart series={[{data:cusums,color:'var(--gold)',label:'C_t'}]} labels={labels} refLine={{value:5,color:'#ef4444',label:'h = 5'}} yLabel="CUSUM" height={180}/>
                  </Panel>
                  <Panel title="Daily Mortality Rate x_t" mono="(deaths_t / initial_n) × 100">
                    <Chart series={[{data:computeDailyMortalityRates(sorted,setup),color:'#ef4444',label:'Daily mort %'}]} labels={labels} refLine={{value:cuMu,color:'rgba(245,158,11,0.6)',label:`μ=${cuMu.toFixed(4)}%`}} yLabel="%" height={180}/>
                  </Panel>
                </div>
                <Panel title="CUSUM Trace" mono="full computation per observation">
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'Space Mono,monospace',fontSize:11}}>
                      <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                        {['Day','Date','Deaths','x_t (%)','x_t−μ−k','C_t','Status'].map(h=><th key={h} style={{padding:'7px 12px',textAlign:'left',fontSize:9,color:'var(--text-dim)',letterSpacing:'0.08em'}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {sorted.map((e,i)=>{
                          const xt=setup.initialBirds>0?(e.deathsToday/setup.initialBirds)*100:0
                          const inc=xt-cuMu-0.5
                          const c=cusums[i]??0
                          return <tr key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'7px 12px',color:'var(--blue-300)'}}>{e.day}</td>
                            <td style={{padding:'7px 12px',color:'var(--text-dim)'}}>{e.date}</td>
                            <td style={{padding:'7px 12px',color:e.deathsToday>5?'#fca5a5':'var(--text)'}}>{e.deathsToday}</td>
                            <td style={{padding:'7px 12px'}}>{xt.toFixed(6)}%</td>
                            <td style={{padding:'7px 12px',color:inc>0?'#fcd34d':'var(--text-dim)'}}>{inc.toFixed(6)}</td>
                            <td style={{padding:'7px 12px',fontWeight:700,color:c>=5?'#ef4444':c>=3?'#f59e0b':'#10b981'}}>{c.toFixed(6)}</td>
                            <td style={{padding:'7px 12px',color:c>=5?'#ef4444':c>=3?'#f59e0b':'#10b981'}}>{c>=5?'🚨 ALERT':c>=3?'⚠ WATCH':'✓ OK'}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <div style={{marginTop:12,background:'var(--navy-800)',borderRadius:9,padding:'14px 20px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                    {[{l:'μ (baseline)',v:`${cuMu.toFixed(6)}%`},{l:'k (slack)',v:'0.5'},{l:'h (limit)',v:'5.0'},{l:'Current C_t',v:cusums.length?cusums[cusums.length-1].toFixed(6):'—'}].map(r=>(
                      <div key={r.l}><p style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'var(--text-dim)',marginBottom:3}}>{r.l}</p><p style={{fontFamily:'Space Mono,monospace',fontSize:14,color:'var(--blue-300)',fontWeight:700}}>{r.v}</p></div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PROFIT */}
        {tab==='profit'&&(
          <div>
            <p style={{fontFamily:'Space Mono,monospace',fontSize:11,color:'var(--cyan)',letterSpacing:'0.15em',marginBottom:6}}>ECONOMIC ANALYSIS</p>
            <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>Profit & Break-Even</h1>
            <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7,marginBottom:20}}>All figures computed from your actual entries and the prices in Setup. No estimates.</p>
            {(!entries.length||!setup.feedPricePerKg)?(
              <div style={{border:'1px dashed var(--border)',borderRadius:10,padding:'48px',textAlign:'center'}}>
                <p style={{fontSize:14,color:'var(--text-dim)',marginBottom:8}}>{!entries.length?'No entries yet.':'Prices not set in Setup.'}</p>
                <button onClick={()=>setTab(!entries.length?'entry':'setup')} style={{background:'transparent',border:'1px solid var(--border-hi)',color:'var(--blue-300)',borderRadius:7,padding:'8px 20px',fontSize:13,cursor:'pointer',marginTop:8}}>{!entries.length?'Enter Data →':'Go to Setup →'}</button>
              </div>
            ):profit?(
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                  <Panel title="P&L Summary" mono="π = Revenue − FeedCost − ChickCost">
                    {[
                      {l:'Surviving birds',v:profit.surviving.toLocaleString(),c:'var(--text)'},
                      {l:'Total feed consumed',v:`${profit.totalFeedKg} kg`,c:'var(--text)'},
                      {l:`Revenue (${profit.surviving.toLocaleString()} × ${sorted[sorted.length-1]?.avgWeightKg} kg × ${setup.salePricePerKg})`,v:`+${profit.revenue.toLocaleString()}`,c:'#10b981'},
                      {l:`Feed cost (${profit.totalFeedKg} kg × ${setup.feedPricePerKg})`,v:`−${profit.feedCost.toLocaleString()}`,c:'#ef4444'},
                      {l:`Chick cost (${setup.initialBirds} × ${setup.chickCost})`,v:`−${profit.chickCosts.toLocaleString()}`,c:'#ef4444'},
                      {l:'Gross profit π',v:`${profit.gross>=0?'+':''}${profit.gross.toLocaleString()}`,c:profit.gross>=0?'#10b981':'#ef4444'},
                    ].map(r=>(
                      <div key={r.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--text-dim)',maxWidth:'60%'}}>{r.l}</span>
                        <span style={{fontFamily:'Space Mono,monospace',fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span>
                      </div>
                    ))}
                  </Panel>
                  <Panel title="Key Ratios" mono="derived from entries + setup">
                    {[
                      {l:'ROI',f:'(π / total_cost) × 100',v:`${profit.roi.toFixed(2)}%`,c:profit.roi>=0?'#10b981':'#ef4444'},
                      {l:'FCR vs Breed Standard',f:`${fcr.toFixed(4)} vs ${setup.breedStandard}`,v:fcr<=setup.breedStandard?'ON TARGET':`+${(fcr-setup.breedStandard).toFixed(4)} OVER`,c:fcr<=setup.breedStandard?'#10b981':'#f59e0b'},
                      {l:'Break-even birds',f:'FC / (sale_price × avg_weight)',v:`${profit.be.toLocaleString()}`,c:'var(--blue-300)'},
                      {l:'Mortality cost',f:'total_deaths × chick_cost',v:(profit.totalDeaths*setup.chickCost).toLocaleString(),c:'#fca5a5'},
                      {l:'Feed cost / kg gain',f:'feed_cost / total_mass_gain',v:(()=>{const gain=sorted.length>=2?(sorted[sorted.length-1].avgWeightKg*sorted[sorted.length-1].birdsAlive)-(sorted[0].avgWeightKg*sorted[0].birdsAlive):0;return gain>0?(profit.feedCost/gain).toFixed(4):'—'})(),c:'var(--text)'},
                    ].map(r=>(
                      <div key={r.l} style={{padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <div>
                            <p style={{fontFamily:'Space Mono,monospace',fontSize:10,color:'var(--text-dim)',marginBottom:2}}>{r.l}</p>
                            <p style={{fontFamily:'Space Mono,monospace',fontSize:9,color:'var(--text-dim)',opacity:0.6}}>{r.f}</p>
                          </div>
                          <span style={{fontFamily:'Space Mono,monospace',fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span>
                        </div>
                      </div>
                    ))}
                  </Panel>
                </div>
                <Panel title="Cumulative Feed Cost vs Projected Revenue" mono="both computed from your actual entries">
                  {(()=>{
                    let cum=0
                    const fc=sorted.map(e=>{cum+=e.feedKgToday*setup.feedPricePerKg;return parseFloat(cum.toFixed(2))})
                    const rev=sorted.map(e=>parseFloat((e.birdsAlive*e.avgWeightKg*setup.salePricePerKg).toFixed(2)))
                    return <Chart series={[{data:rev,color:'#10b981',label:'Projected revenue'},{data:fc,color:'#ef4444',label:'Cumulative feed cost',dashed:true}]} labels={labels} height={180} yLabel="currency"/>
                  })()}
                </Panel>
              </>
            ):null}
          </div>
        )}

      </main>
    </div>
  )
}

function computeDailyMortalityRates(e: DailyEntry[], s: FlockSetup) {
  return e.map(x=>s.initialBirds>0?(x.deathsToday/s.initialBirds)*100:0)
}