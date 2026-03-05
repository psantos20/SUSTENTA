import { useState } from 'react'
import Login from './pages/Login'

function App() {
  const [usuario, setUsuario] = useState(null)

  return (
    <div>
      {!usuario ? (
        <Login onLogin={setUsuario} />
      ) : (
        <h1 style={{ textAlign: 'center', marginTop: '40px', color: '#16a34a' }}>
          Bem-vindo, {usuario.email}! 🌿
        </h1>
      )}
    </div>
  )
}

export default App