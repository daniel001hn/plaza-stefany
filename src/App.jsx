import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PlazaStefany from './PlazaStefany'
import InquilinoView from './InquilinoView'
import './storageAdapter'

// La contraseña del admin SOLO viene de la env var. NO hay fallback hardcoded:
// un fallback queda en el JS bundle del cliente y cualquiera con DevTools lo ve.
// Si la env var no está seteada (deploy mal configurado), el login admin falla.
const ADMIN_PASSWORD = import.meta.env.VITE_APP_PASSWORD
const SESSION_KEY = 'plaza_session'

const css = `
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  .lc{animation:fadeIn 0.45s cubic-bezier(0.16,1,0.3,1)}
  .li{transition:all 0.2s ease}
  .li:focus{outline:none;border-color:rgba(255,255,255,0.22)!important;background:rgba(255,255,255,0.1)!important}
  .lb{transition:all 0.15s ease;cursor:pointer}
  .lb:hover:not(:disabled){background:rgba(255,255,255,0.96)!important;transform:scale(1.01)}
  .lb:active:not(:disabled){transform:scale(0.99)}
`

function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')

    await new Promise(r => setTimeout(r, 400))

    // Convertir usuario+password → email+password para Supabase Auth.
    // Admin: usuario vacío → admin@plaza-stefany.local
    // Inquilino: tatys → tatys@plaza-stefany.local
    const usuarioStr = usuario.trim().toLowerCase()
    const email = usuarioStr ? `${usuarioStr}@plaza-stefany.local` : 'admin@plaza-stefany.local'

    // PASO 1: intentar Supabase Auth (modo nuevo, exige RLS activado)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!authErr && data?.user) {
        const meta = data.user.user_metadata || {}
        const isAdmin = meta.role === 'admin' || email === 'admin@plaza-stefany.local'
        if (isAdmin) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin' }))
          onLogin({ role: 'admin' })
          return
        }
        // Inquilino: lookup localId/nombre del config
        try {
          const raw = await window.storage.get('config-and-locales')
          const cfg = raw ? JSON.parse(raw) : {}
          const usuarios = cfg.config?.usuarios || cfg.usuarios || []
          const match = usuarios.find(u => u.usuario.toLowerCase() === usuarioStr)
          if (match) {
            const session = { role: 'inquilino', localId: match.localId, nombre: match.nombre }
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
            onLogin(session)
            return
          }
        } catch(e) {}
      }
    } catch(e) {
      // Supabase Auth no responde — caer al modo legacy
    }

    // PASO 2: fallback legacy (mientras la migración no esté completa).
    // Una vez RLS esté activo, este path falla porque no hay JWT y la DB
    // bloquea todo. Sirve solo durante el periodo de transición.
    if (!usuarioStr && ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin' }))
      onLogin({ role: 'admin' })
      return
    }
    try {
      const raw = await window.storage.get('config-and-locales')
      const data = raw ? JSON.parse(raw) : {}
      const usuarios = data.config?.usuarios || data.usuarios || []
      const match = usuarios.find(u =>
        u.usuario.toLowerCase() === usuarioStr &&
        u.password === password
      )
      if (match) {
        const session = { role: 'inquilino', localId: match.localId, nombre: match.nombre }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
        onLogin(session)
        return
      }
    } catch(e) {}

    setError('Usuario o contraseña incorrectos')
    setLoading(false)
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const inp = { width:'100%',padding:'13px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',caretColor:'#fff',marginBottom:'10px' }
  const inpErr = { ...inp, background:'rgba(255,59,48,0.08)', border:'1px solid rgba(255,59,48,0.5)' }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(145deg,#1c1c1e 0%,#2c2c2e 50%,#1c1c1e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif',WebkitFontSmoothing:'antialiased'}}>
      <style>{css}</style>
      <div className='lc' style={{width:'340px',background:'rgba(44,44,46,0.88)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.1)',padding:'44px 36px 40px',boxShadow:'0 32px 80px rgba(0,0,0,0.6)',animation:shake?'shake 0.4s ease':undefined}}>
        <div style={{width:'68px',height:'68px',background:'linear-gradient(145deg,#3a3a3c,#2c2c2e)',borderRadius:'16px',margin:'0 auto 24px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',boxShadow:'0 4px 16px rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.08)'}}>🏢</div>
        <h1 style={{color:'#fff',fontSize:'22px',fontWeight:'700',textAlign:'center',margin:'0 0 4px',letterSpacing:'-0.4px'}}>Plaza Stefany</h1>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:'13px',textAlign:'center',margin:'0 0 28px'}}>Portal de acceso</p>
        <form onSubmit={handleSubmit}>
          <input className='li' type='text' placeholder='Usuario (dejar vacío si sos admin)' value={usuario} onChange={e=>{setUsuario(e.target.value);setError('')}} style={error?inpErr:inp} autoComplete='off' />
          <input className='li' type='password' placeholder='Contraseña' value={password} onChange={e=>{setPassword(e.target.value);setError('')}} style={error?inpErr:inp} autoComplete='new-password' />
          {error && <p style={{color:'rgb(255,69,58)',fontSize:'12px',margin:'0 0 12px 2px'}}>{error}</p>}
          <button className='lb' type='submit' disabled={loading||!password} style={{width:'100%',padding:'14px',background:password&&!loading?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.12)',color:password&&!loading?'#1c1c1e':'rgba(255,255,255,0.25)',border:'none',borderRadius:'12px',fontSize:'15px',fontFamily:'inherit',fontWeight:'600',marginTop:'4px'}}>
            {loading ? 'Verificando…' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Deriva el "session" local (role + localId + nombre) desde la auth de Supabase.
// Para tenants necesita buscar localId/nombre en config-and-locales.usuarios.
async function deriveSession(user) {
  if (!user) return null
  const email = (user.email || '').toLowerCase()
  const meta = user.user_metadata || {}
  const isAdmin = meta.role === 'admin' || email === 'admin@plaza-stefany.local'
  if (isAdmin) return { role: 'admin' }
  // Inquilino: lookup localId por usuario (parte antes del @)
  const usuarioStr = email.split('@')[0]
  try {
    const raw = await window.storage.get('config-and-locales')
    const cfg = raw ? JSON.parse(raw) : {}
    const usuarios = cfg.config?.usuarios || cfg.usuarios || []
    const match = usuarios.find(u => u.usuario.toLowerCase() === usuarioStr)
    if (match) return { role: 'inquilino', localId: match.localId, nombre: match.nombre }
  } catch(e) {}
  return null
}

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Fuente de verdad: supabase.auth.getSession(). sessionStorage se usa solo
    // como cache temporal del role/localId derivado.
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user) {
        const derived = await deriveSession(data.session.user)
        if (!cancelled && derived) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(derived))
          setSession(derived)
        }
      } else {
        sessionStorage.removeItem(SESSION_KEY)
      }
      if (!cancelled) setChecking(false)
    })()
    // Reaccionar a cambios de auth (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, supSession) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(SESSION_KEY)
        if (!cancelled) setSession(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (supSession?.user) {
          const derived = await deriveSession(supSession.user)
          if (!cancelled && derived) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(derived))
            setSession(derived)
          }
        }
      }
    })
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.() }
  }, [])

  const handleLogout = async () => {
    sessionStorage.removeItem(SESSION_KEY)
    try { await supabase.auth.signOut() } catch (e) {}
    setSession(null)
  }

  if (checking) return null
  if (!session) return <LoginScreen onLogin={setSession} />
  if (session.role === 'admin') return <PlazaStefany supabase={supabase} onLogout={handleLogout} />
  if (session.role === 'inquilino') return <InquilinoView session={session} onLogout={handleLogout} />
  return <LoginScreen onLogin={setSession} />
}

export default App
