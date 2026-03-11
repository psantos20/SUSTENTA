import React from 'react';
import { Sidebar } from './Sidebar';
import { Search, Bell, Leaf, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activePage, onNavigate, onLogout, nivel, xpAtual, xpTotal, nomeNivel }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        nivel={nivel}
        xpAtual={xpAtual}
        xpTotal={xpTotal}
        nomeNivel={nomeNivel}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por análises, registros..."
                className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-slate-400 text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('profile')}>
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-900">Meu Perfil</p>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Premium</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="p-8 border-t border-slate-200 mt-12 text-center text-slate-400 text-sm">
          <p>© 2026 Sustenta - Gestão Inteligente de Consumo e Sustentabilidade</p>
        </footer>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-60 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-70 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-xl">
                    <Leaf className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">Sustenta</span>
                </div>
                <button className="p-2 text-slate-400" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <Sidebar
                activePage={activePage}
                onNavigate={(page) => { onNavigate(page); setIsMobileMenuOpen(false); }}
                onLogout={onLogout}
                nivel={nivel}
                xpAtual={xpAtual}
                xpTotal={xpTotal}
                nomeNivel={nomeNivel}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};