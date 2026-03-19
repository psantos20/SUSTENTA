import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Mail, Lock, ArrowRight, User, Phone } from 'lucide-react';
import { auth, googleProvider, db } from '../../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import MapaBrasil from '../components/MapaBrasil';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister]   = React.useState(false);
  const [step, setStep]               = React.useState(1);
  const [email, setEmail]             = React.useState('');
  const [password, setPassword]       = React.useState('');
  const [nome, setNome]               = React.useState('');
  const [telefone, setTelefone]       = React.useState('');
  const [estado, setEstado]           = React.useState('');
  const [cidade, setCidade]           = React.useState('');
  const [erro, setErro]               = React.useState('');
  const [carregando, setCarregando]   = React.useState(false);

  // Quando o estado muda, limpa a cidade
  React.useEffect(() => {
    setCidade('');
  }, [estado]);

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch {
      setErro('E-mail ou senha inválidos.');
    }
    setCarregando(false);
  };

  // ─── Cadastro step 1 ─────────────────────────────────────────────────────
  const handleRegisterStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim())     { setErro('Informe seu nome.');              return; }
    if (!email.trim())    { setErro('Informe seu e-mail.');            return; }
    if (password.length < 6) { setErro('A senha precisa ter ao menos 6 caracteres.'); return; }
    setErro('');
    setStep(2);
  };

  // ─── Cadastro step 2 ─────────────────────────────────────────────────────
  const handleRegisterStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estado) { setErro('Selecione seu estado no mapa.'); return; }
    if (!cidade) { setErro('Selecione sua cidade.');         return; }
    setErro('');
    setCarregando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nome,
        telefone,
        estado,
        cidade,
        email: cred.user.email,
        criadoEm: new Date().toISOString(),
      });
      onLogin();
    } catch {
      setErro('Erro ao criar conta. Verifique os dados e tente novamente.');
    }
    setCarregando(false);
  };

  // ─── Google ───────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setErro('');
    setCarregando(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'usuarios', cred.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'usuarios', cred.user.uid), {
          nome: cred.user.displayName || '',
          email: cred.user.email,
          telefone: '',
          estado: '',
          cidade: '',
          criadoEm: new Date().toISOString(),
        });
      }
      onLogin();
    } catch {
      setErro('Erro ao entrar com Google.');
    }
    setCarregando(false);
  };

  const resetForm = () => {
    setStep(1);
    setErro('');
    setEstado('');
    setCidade('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">

      {/* ── Painel esquerdo (desktop) ───────────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 bg-emerald-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-800 rounded-full blur-3xl opacity-30 -ml-20 -mb-20" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl">
            <Leaf className="text-emerald-700 w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Sustenta</span>
        </div>

        <div className="relative z-10 max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6"
          >
            Seu companheiro rumo a um mundo mais sustentável.
          </motion.h1>
          <p className="text-emerald-100 text-lg">
            Monitore seus hábitos, reduza seu impacto ambiental e ganhe recompensas por suas ações positivas.
          </p>
        </div>

        <div className="relative z-10 flex gap-4 text-emerald-200 text-sm">
          <span className="cursor-pointer hover:text-white transition-colors">Sobre nós</span>
          <span className="cursor-pointer hover:text-white transition-colors">Privacidade</span>
          <span className="cursor-pointer hover:text-white transition-colors">Termos de uso</span>
        </div>
      </div>

      {/* ── Painel direito (formulário) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">

          {/* Cabeçalho */}
          <div className="text-center md:text-left">
            <div className="md:hidden flex justify-center mb-6">
              <div className="bg-emerald-600 p-3 rounded-2xl">
                <Leaf className="text-white w-8 h-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              {!isRegister
                ? 'Entrar no Sustenta'
                : step === 1
                  ? 'Crie sua conta'
                  : 'Onde você mora?'}
            </h2>
            <p className="text-slate-500 mt-2">
              {!isRegister
                ? 'Acesse seu painel.'
                : step === 1
                  ? 'Preencha seus dados básicos.'
                  : 'Isso nos ajuda a personalizar sua experiência.'}
            </p>
          </div>

          {/* Steps indicator */}
          {isRegister && (
            <div className="flex items-center gap-2">
              {[1, 2].map(s => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${step >= s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {s}
                  </div>
                  {s < 2 && (
                    <div className={`flex-1 h-1 rounded-full transition-all
                      ${step > s ? 'bg-emerald-500' : 'bg-slate-100'}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm text-center border border-red-100">
              {erro}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Login ─────────────────────────────────────────────────── */}
            {!isRegister && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Senha</label>
                    <button type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      Esqueceu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                >
                  {carregando ? 'Aguarde...' : 'Entrar'}
                  {!carregando && <ArrowRight className="w-5 h-5" />}
                </button>
              </motion.form>
            )}

            {/* ── Cadastro step 1 ───────────────────────────────────────── */}
            {isRegister && step === 1 && (
              <motion.form
                key="register1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRegisterStep1}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text" required value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Telefone <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel" value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
              </motion.form>
            )}

            {/* ── Cadastro step 2 — mapa + cidade ──────────────────────── */}
            {isRegister && step === 2 && (
              <motion.form
                key="register2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegisterStep2}
                className="space-y-4"
              >
                <p className="text-sm text-slate-500">Clique no seu estado no mapa:</p>

                {/* MapaBrasil com seleção de estado + cidade integrada */}
                <MapaBrasil
                  estadoSelecionado={estado}
                  cidadeSelecionada={cidade}
                  onEstadoClick={(sigla) => {
                    setEstado(sigla);
                    setCidade('');
                    setErro('');
                  }}
                  onCidadeChange={(novaCidade) => {
                    setCidade(novaCidade);
                    setErro('');
                  }}
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErro(''); }}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit" disabled={carregando}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {carregando ? 'Criando...' : 'Criar conta'}
                    {!carregando && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </motion.form>
            )}

          </AnimatePresence>

          {/* Google (só no login) */}
          {!isRegister && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-50 text-slate-500">Ou continue com</span>
                </div>
              </div>

              <button
                onClick={handleGoogle} disabled={carregando}
                className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors font-medium text-slate-700 disabled:opacity-60"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google" className="w-4 h-4"
                />
                Google
              </button>
            </>
          )}

          {/* Toggle login / cadastro */}
          <p className="text-center text-slate-600">
            {isRegister ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              onClick={() => { setIsRegister(!isRegister); resetForm(); }}
              className="ml-2 font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {isRegister ? 'Faça login' : 'Cadastre-se'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};