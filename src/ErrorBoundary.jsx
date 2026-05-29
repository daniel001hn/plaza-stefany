import { Component } from 'react'

// Red de seguridad global: si CUALQUIER componente tira una excepción al
// renderizar, en vez de quedar en pantalla blanca mostramos un mensaje con
// botón de recargar. Sin esto, un dato undefined (ej. local sin cargar)
// mataba toda la app.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
        padding: '2rem', textAlign: 'center',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        background: '#f0f0f5', color: '#1C1C1E',
      }}>
        <div style={{ fontSize: '2.8rem' }}>🔧</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Algo se trabó</div>
        <div style={{ fontSize: '.88rem', color: '#6E6E78', maxWidth: 340 }}>
          Recargá la página. Si el problema sigue, avisanos por WhatsApp al 9462-8618.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '.7rem 1.4rem', borderRadius: 10, border: 'none',
            background: '#6366F1', color: '#fff', fontWeight: 600,
            fontSize: '.9rem', cursor: 'pointer',
          }}
        >Recargar</button>
      </div>
    )
  }
}
