import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PlazaStefany from './PlazaStefany.jsx'

export default function App() {
  const [dbReady, setDbReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('config').select('id').limit(1)
      .then(({ error }) => {
        if (error) { setError(error.message) } else { setDbReady(true) }
      })
  }, [])

  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0a0a',color:'#ef4444',fontFamily:'monospace',padding:20,textAlign:'center'}}>
      <div>
        <div style={{fontSize:48,marginBottom:16}}>error</div>
        <div style={{fontSize:18,marginBottom:8}}>Error conectando a Supabase</div>
        <div style={{fontSize:12,opacity:0.7}}>{error}</div>
      </div>
    </div>
  )

  if (!dbReady) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0a0a',color:'#3ecf8e',fontFamily:'monospace'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>plaza</div>
        <div style={{fontSize:18}}>Conectando Plaza Stefany...</div>
      </div>
    </div>
  )

  return React.createElement(PlazaStefany, { supabase })
}