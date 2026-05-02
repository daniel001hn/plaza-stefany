import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PlazaStefany from './PlazaStefany'

const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'STEFANYPLAZA100280'
const SESSION_KEY = 'plaza_auth'

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
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1')
        onLogin()
      } else {
        setError('Contraseña incorrecta')
        setLoading(false)
        setShake(true)
        setTimeout(() => setShake(false), 600)
      }
    }, 600)
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(145deg,#1c1c1e 0%,#2c2c2e 50%,#1c1c1e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif',WebkitFontSmoothing:'antialiased'}}>
      <style>{css}</style>
      <div className='lc' style={{width:'340px',background:'rgba(44,44,46,0.88)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.1)',padding:'44px 36px 40px',boxShadow:'0 32px 80px rgba(0,0,0,0.6),0 0 0 0.5px rgba(255,255,255,0.05)',animation:shake?'shake 0.4s ease':undefined}}>
        <div style={{width:'68px',height:'68px',background:'linear-gradient(145deg,#3a3a3c,#2c2c2e)',borderRadius:'16px',margin:'0 auto 24px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',boxShadow:'0 4px 16px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.08)'}}>🏢</div>
        <h1 style={{color:'#fff',fontSize:'22px',fontWeight:'700',textAlign:'center',margin:'0 0 4px',letterSpacing:'-0.4px'}}>Plaza Stefany</h1>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:'13px',textAlign:'center',margin:'0 0 32px'}}>Control · V3</p>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:error?'10px':'16px'}}>
            <input className='li' type='password' placeholder='Contraseña' value={password} onChange={e=>{setPassword(e.target.value);setError('')}} style={{width:'100%',padding:'14px 16px',background:error?'rgba(255,59,48,0.08)':'rgba(255,255,255,0.07)',border:error?'1px solid rgba(255,59,48,0.5)':'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',caretColor:'#fff'}} autoFocus />
          </div>
          {error&&<p style={{color:'rgb(255,69,58)',fontSize:'12px',margin:'0 0 14px 4px'}}>{error}</p>}
          <button className='lb' type='submit' disabled={loading||!password} style={{width:'100%',padding:'14px',background:password&&!loading?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.12)',color:password&&!loading?'#1c1c1e':'rgba(255,255,255,0.25)',border:'none',borderRadius:'12px',fontSize:'15px',fontFamily:'inherit',fontWeight:'600',letterSpacing:'-0.1px',cursor:loading?'default':password?'pointer':'default'}}>
            {loading?'Verificando…':'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(false)
  useEffect(() => { if (sessionStorage.getItem(SESSION_KEY)==='1') setAuthed(true) }, [])
  if (!authed) return <LoginScreen onLogin={()=>setAuthed(true)} />
  return <PlazaStefany supabase={supabase} />
}

export default App