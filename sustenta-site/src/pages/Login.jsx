import { useState } from 'react'
import { auth, googleProvider } from '../services/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState('login')

  const handleEmailSenha = async () => {
    setErro('')
    setCarregando(true)
    try {
      let resultado
      if (modo === 'login') {
        resultado = await signInWithEmailAndPassword(auth, email, senha)
      } else {
        resultado = await createUserWithEmailAndPassword(auth, email, senha)
      }
      onLogin(resultado.user)
    } catch (e) {
      setErro('E-mail ou senha inválidos. Tente novamente.')
    }
    setCarregando(false)
  }

  const handleGoogle = async () => {
    setErro('')
    setCarregando(true)
    try {
      const resultado = await signInWithPopup(auth, googleProvider)
      onLogin(resultado.user)
    } catch (e) {
      setErro('Erro ao entrar com Google.')
    }
    setCarregando(false)
  }

  return (
    <div style={styles.wrapper}>

      {/* PAINEL ESQUERDO VERDE */}
      <div style={styles.esquerda}>
        <div style={styles.logo}>
          <span style={styles.logoIcone}>🌿</span>
          <span style={styles.logoNome}>Sustenta</span>
        </div>

        <div style={styles.heroTexto}>
          <h1 style={styles.heroTitulo}>
            Seu companheiro rumo a um mundo mais sustentável.
          </h1>
          <p style={styles.heroSubtitulo}>
            Monitore seus hábitos, reduza seu impacto ambiental e
            ganhe recompensas por suas ações positivas.
          </p>
        </div>

        <div style={styles.rodape}>
          <span style={styles.rodapeLink}>Sobre nós</span>
          <span style={styles.rodapeLink}>Privacidade</span>
          <span style={styles.rodapeLink}>Termos de uso</span>
        </div>
      </div>

      {/* PAINEL DIREITO FORMULÁRIO */}
      <div style={styles.direita}>
        <div style={styles.formulario}>

          <h2 style={styles.titulo}>
            {modo === 'login' ? 'Entrar no Sustenta' : 'Criar conta no Sustenta'}
          </h2>
          <p style={styles.subtitulo}>
            Acesse seu painel para acompanhar seu progresso.
          </p>

          {erro && <p style={styles.erro}>{erro}</p>}

          {/* Campo Email */}
          <div style={styles.campoGrupo}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcone}>✉️</span>
              <input
                style={styles.input}
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div style={styles.campoGrupo}>
            <div style={styles.senhaHeader}>
              <label style={styles.label}>Senha</label>
              {modo === 'login' && (
                <span style={styles.esqueceu}>Esqueceu a senha?</span>
              )}
            </div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcone}>🔒</span>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />
            </div>
          </div>

          {/* Botão principal */}
          <button
            style={styles.botaoPrincipal}
            onClick={handleEmailSenha}
            disabled={carregando}
          >
            {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar →' : 'Cadastrar →'}
          </button>

          {/* Divisor */}
          <div style={styles.divisor}>
            <div style={styles.linha} />
            <span style={styles.ouTexto}>Ou continue com</span>
            <div style={styles.linha} />
          </div>

          {/* Botões sociais */}
          <div style={styles.botoessociais}>
            <button style={styles.botaoSocial} onClick={handleGoogle} disabled={carregando}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                style={{ width: 18, marginRight: 8 }}
              />
              Google
            </button>
            <button style={styles.botaoSocial} disabled>
              <span style={{ marginRight: 8 }}>⌥</span>
              GitHub
            </button>
          </div>

          {/* Alternar modo */}
          <p style={styles.alternar}>
            {modo === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <span
              style={styles.link}
              onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
            >
              {modo === 'login' ? 'Cadastre-se' : 'Entrar'}
            </span>
          </p>

        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Inter', sans-serif",
  },

  // ESQUERDA
  esquerda: {
    width: '45%',
    backgroundColor: '#166534',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '40px 48px',
    color: 'white',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcone: {
    fontSize: '28px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '8px',
    borderRadius: '12px',
  },
  logoNome: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'white',
  },
  heroTexto: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingBottom: '40px',
  },
  heroTitulo: {
    fontSize: '36px',
    fontWeight: '900',
    lineHeight: '1.2',
    marginBottom: '20px',
    color: 'white',
  },
  heroSubtitulo: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: '1.6',
  },
  rodape: {
    display: 'flex',
    gap: '24px',
  },
  rodapeLink: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
  },

  // DIREITA
  direita: {
    width: '55%',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  formulario: {
    width: '100%',
    maxWidth: '440px',
  },
  titulo: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '8px',
  },
  subtitulo: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '32px',
  },
  erro: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  campoGrupo: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  senhaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  esqueceu: {
    fontSize: '13px',
    color: '#16a34a',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: 'white',
    padding: '0 14px',
    gap: '10px',
  },
  inputIcone: {
    fontSize: '16px',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '14px 0',
    backgroundColor: 'transparent',
    color: '#1e293b',
  },
  botaoPrincipal: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginBottom: '24px',
    letterSpacing: '0.3px',
  },
  divisor: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  linha: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  ouTexto: {
    fontSize: '13px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  botoesociais: {
    display: 'flex',
    gap: '12px',
    marginBottom: '28px',
  },
  botaoSocial: {
    flex: 1,
    padding: '13px',
    backgroundColor: 'white',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternar: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#64748b',
  },
  link: {
    color: '#16a34a',
    fontWeight: '700',
    cursor: 'pointer',
  },
}