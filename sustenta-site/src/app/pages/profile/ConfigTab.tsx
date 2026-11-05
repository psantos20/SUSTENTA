import { Bell, Lock, Globe, Moon, HelpCircle, LogOut, Star, Info, ShieldCheck, ChevronRight, Save, CheckCircle2, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import type { PerfilCtx } from './usePerfil';

export function ConfigTab(p: PerfilCtx) {
  const { darkMode, toggleDarkMode, setModalAberto, setErro, toggleNotif, setToggleNotif, emailVerificado, setModal2FA, setModalExcluir, setSenhaExclusao, setConfirmacaoExclusao, setLinkEnviado, setModalDados, handleExportarDados } = p;
  return (
    <motion.div
      key="config"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {[
        {
          title: 'Preferencias do Sistema',
          items: [
            {
              icon: darkMode ? Sun : Moon,
              label: darkMode ? 'Modo Claro' : 'Modo Escuro',
              desc: darkMode ? 'Clique para voltar ao tema claro' : 'Interface adaptada para ambientes escuros',
              toggle: true,
              ativo: darkMode,
              onToggle: toggleDarkMode,
            },
            {
              icon: Bell,
              label: 'Notificacoes',
              desc: 'Alertas de faturas, habitos e conquistas',
              toggle: true,
              ativo: toggleNotif,
              onToggle: () => setToggleNotif((p) => !p),
            },
            { icon: Globe, label: 'Idioma', desc: 'Portugues (Brasil)', toggle: false },
          ],
        },
        {
          title: 'Seguranca e Privacidade',
          items: [
            { icon: Lock, label: 'Alterar Senha', desc: 'Mantenha sua conta protegida', toggle: false, onClick: () => setModalAberto('senha') },
            {
              icon: ShieldCheck,
              label: 'Verificacao de E-mail',
              desc: emailVerificado ? 'E-mail verificado — conta protegida' : 'Verifique seu e-mail para maior seguranca',
              toggle: false,
              onClick: emailVerificado ? undefined : () => { setLinkEnviado(false); setModal2FA(true); setErro(''); },
              isVerified: emailVerificado,
            },
            { icon: Info, label: 'Dados Compartilhados', desc: 'Gerencie o que a familia visualiza', toggle: false, onClick: () => setModalDados(true) },
            { icon: Save, label: 'Baixar Meus Dados', desc: 'Copia de todos os seus dados (LGPD)', toggle: false, onClick: handleExportarDados },
          ],
        },
        {
          title: 'Sobre o Sustenta',
          items: [
            { icon: HelpCircle, label: 'Central de Ajuda', desc: 'Duvidas frequentes e suporte', toggle: false },
            { icon: Star, label: 'Avaliar o App', desc: 'Ajude-nos a melhorar o Sustenta', toggle: false },
            { icon: LogOut, label: 'Excluir Conta', desc: 'Remover permanentemente seus dados', toggle: false, isDanger: true, onClick: () => { setSenhaExclusao(''); setConfirmacaoExclusao(''); setErro(''); setModalExcluir(true); } },
          ],
        },
      ].map((group, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{group.title}</h3>
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            {group.items.map((item: any, i) => (
              <button
                key={i}
                onClick={item.onClick}
                disabled={item.isVerified}
                className={`w-full flex items-center justify-between p-5 transition-colors group ${i !== group.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-700' : ''} ${item.isVerified ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-3 rounded-2xl shadow-sm ${item.isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : item.isVerified ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 transition-all'}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${item.isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{item.label}</p>
                    <p className={`text-[10px] font-medium ${item.isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{item.desc}</p>
                  </div>
                </div>

                {item.toggle ? (
                  <div
                    onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }}
                    className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${item.ativo ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${item.ativo ? 'translate-x-6' : ''}`} />
                  </div>
                ) : item.isVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-all" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center py-8">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sustenta Web v1.0.0 - 2026</p>
        <div className="flex justify-center gap-6 mt-2">
          <button className="text-[10px] font-bold text-emerald-600 hover:underline">Politicas de Privacidade</button>
          <button className="text-[10px] font-bold text-emerald-600 hover:underline">Termos de Uso</button>
        </div>
      </div>
    </motion.div>
  );
}
