import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FamiliaTab } from './profile/FamiliaTab';
import { PerfilTab } from './profile/PerfilTab';
import { ModaisPerfil } from './profile/ModaisPerfil';
import { ConfigTab } from './profile/ConfigTab';
import { usePerfil } from './profile/usePerfil';

export const ProfilePage: React.FC = () => {
  const ctx = usePerfil();
  const { activeTab, setActiveTab, carregando, sucesso, erro } = ctx;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">
      <AnimatePresence>
        {sucesso && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {sucesso}
          </motion.div>
        )}

        {erro && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erro}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Configuracao de Conta
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie sua identidade, grupo familiar e preferencias.
          </p>
        </div>

        <div className="flex p-1 gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full w-fit max-w-full overflow-x-auto">
          {(['perfil', 'familia', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'perfil' ? 'Seu Perfil' : tab === 'familia' ? 'Modo Familia' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'perfil' && (
<PerfilTab key="perfil" {...ctx} />
        )}

        {activeTab === 'familia' && (
<FamiliaTab key="familia" {...ctx} />
        )}

        {activeTab === 'config' && (
<ConfigTab key="config" {...ctx} />
        )}
      </AnimatePresence>

<ModaisPerfil {...ctx} />
    </div>
  );
};
