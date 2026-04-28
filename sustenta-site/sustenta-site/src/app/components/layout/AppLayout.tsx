import React from 'react';
import { Sidebar } from './Sidebar';
import { Bell, Leaf, Menu, X, Search, CheckCheck, AlertCircle, Trophy, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../../../../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNotificacoes, type TipoNotificacao } from '../../contexts/NotificacoesPage';

// --- Icone por tipo de notificacao ---

const ICONE_TIPO: Record<TipoNotificacao, React.ElementType> = {
  alerta_gasto: AlertCircle,
  conquista:    Trophy,
  lembrete:     Calendar,
  familia:      Users,
};

const COR_TIPO: Record<TipoNotificacao, string> = {
  alerta_gasto: 'text-amber-500',
  conquista:    'text-emerald-500',
  lembrete:     'text-blue-500',
  familia:      'text-purple-500',
};

function formatarTempo(data: Date): string {
  const diff = Date.now() - data.getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}min`;
  if (h < 24)   return `${h}h`;
  return `${d}d`;
}

// --- Props ---

interface AppLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  nivel?: number;
  xpAtual?: number;
  xpTotal?: number;
  nomeNivel?: string;
}

// --- Componente ---

export const AppLayout: React.FC<AppLayoutProps> = ({
  children, activePage, onNavigate, onLogout,
  nivel, xpAtual, xpTotal, nomeNivel,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [dropdownAberto,   setDropdownAberto]   = React.useState(false);
  const [nomeUsuario,      setNomeUsuario]       = React.useState('');
  const [iniciaisUsuario,  setIniciaisUsuario]   = React.useState('');

  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Carrega nome do usuario
  React.useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'usuarios', user.uid)).then(snap => {
      if (snap.exists()) {
        const nome = snap.data().nome || '';
        setNomeUsuario(nome);
        setIniciaisUsuario(
          nome.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
        );
      }
    }).catch(() => {});
  }, []);

  // Fecha dropdown ao clicar fora
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar
        activePage={activePage} onNavigate={onNavigate} onLogout={onLogout}
        nivel={nivel} xpAtual={xpAtual} xpTotal={xpTotal} nomeNivel={nomeNivel}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por analises, registros..."
                className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-slate-400 text-slate-900 dark:text-slate-100" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sino de notificacoes */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownAberto(p => !p)}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
              >
                <Bell className="w-5 h-5" />
                {naoLidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-800">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {dropdownAberto && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50"
                  >
                    {/* Header dropdown */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notificacoes</span>
                        {naoLidas > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {naoLidas}
                          </span>
                        )}
                      </div>
                      {naoLidas > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); marcarTodasLidas(); }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                          <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                        </button>
                      )}
                    </div>

                    {/* Lista completa no dropdown */}
                    <div className="max-h-96 overflow-y-auto">
                      {notificacoes.length === 0 ? (
                        <div className="py-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma notificacao</p>
                        </div>
                      ) : (
                        notificacoes.map(notif => {
                          const Icon = ICONE_TIPO[notif.tipo];
                          const cor  = COR_TIPO[notif.tipo];
                          return (
                            <button key={notif.id}
                              onClick={() => { marcarLida(notif.id); setDropdownAberto(false); }}
                              className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0
                                ${!notif.lida ? 'bg-slate-50/50 dark:bg-slate-700/20' : ''}`}
                            >
                              <div className={`shrink-0 mt-0.5 ${notif.icone ? 'text-lg' : ''}`}>
                                {notif.icone
                                  ? <span>{notif.icone}</span>
                                  : <Icon className={`w-4 h-4 ${cor}`} />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${notif.lida ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                  {notif.titulo}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                  {notif.mensagem}
                                </p>
                                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                                  {formatarTempo(notif.criadaEm)}
                                </p>
                              </div>
                              {!notif.lida && (
                                <div className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* Avatar */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('profile')}>
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{nomeUsuario || 'Meu Perfil'}</p>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{nomeNivel || 'Iniciante'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm">
                {iniciaisUsuario
                  ? <span className="text-white text-sm font-black">{iniciaisUsuario}</span>
                  : <Leaf className="w-5 h-5 text-white" />
                }
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="p-8 border-t border-slate-200 dark:border-slate-700 mt-12 text-center text-slate-400 dark:text-slate-500 text-sm transition-colors">
          <p>© 2026 Sustenta — Gestao Inteligente de Consumo e Sustentabilidade</p>
        </footer>
      </div>

      {/* Menu mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 z-[70] lg:hidden flex flex-col shadow-2xl transition-colors"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-xl">
                    <Leaf className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">Sustenta</span>
                </div>
                <button className="p-2 text-slate-400 dark:hover:text-slate-200" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <Sidebar
                activePage={activePage}
                onNavigate={(page) => { onNavigate(page); setIsMobileMenuOpen(false); }}
                onLogout={onLogout}
                nivel={nivel} xpAtual={xpAtual} xpTotal={xpTotal} nomeNivel={nomeNivel}
                mobile
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};