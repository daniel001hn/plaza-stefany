import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PlazaStefany from './PlazaStefany'

const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'STEFANYPLAZA100280'
const SESSION_KEY = 'plaza_auth'

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1')
        onLogin()
      } else {
        setError('Contraseña incorrecta')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #1a3a1a',
        borderRadius: '12px',
        padding: '40px',
        width: '320px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏢</div>
        <h1 style={{ color: '#4ade80', fontSize: '22px', margin: '0 0 4px 0' }}>Plaza Stefany</h1>
        <p style={{ color: '#555', fontSize: '12px', marginBottom: '28px' }}>Control · V3</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1a1a1a',
              border: error ? '1px solid #ef4444' : '1px solid #222',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              marginBottom: '12px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
            autoFocus
          />
          {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px 0' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#1a3a1a' : '#4ade80',
              color: loading ? '#4ade80' : '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setAuthed(true)
    }
  }, [])

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />
  return <PlazaStefany supabase={supabase} />
}

export default App
