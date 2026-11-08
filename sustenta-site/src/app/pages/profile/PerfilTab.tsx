import { MapPin, Calendar, Mail, Phone, Leaf, Trophy, Users, Edit2, Camera, Lock, Zap, Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../../../services/firebase';
import { NOME_POR_SIGLA, formatarMesAno, iniciais, moeda } from './auxiliares';
import { MedalhasCard } from './MedalhasCard';
import type { PerfilCtx } from './usePerfil';

export function PerfilTab(p: PerfilCtx) {
  const { setActiveTab, usuario, estatisticas, grupo, setModalAberto, nivel, xpPercent, nivelCor, nomeUsuario, xpTotal, conquistas, medalhas } = p;
  return (
    <motion.div
      key="perfil"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="relative mb-8">
        <div className="h-48 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="absolute top-4 right-4 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-bold">
              Nivel {nivel.nivel} — {nivel.nome}
            </span>
          </div>
        </div>

        <div className="px-8 -mt-16 flex flex-col md:flex-row items-end gap-6 relative z-10">
          <div className="relative shrink-0">
            <div className={`w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl bg-gradient-to-br ${nivelCor} flex items-center justify-center`}>
              <span className="text-4xl font-black text-white">{iniciais(nomeUsuario)}</span>
            </div>
            <button
              onClick={() => setModalAberto('dados')}
              className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors border-2 border-white dark:border-slate-800"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {nomeUsuario}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {nivel.nome} Nivel {nivel.nivel}
                  {usuario?.cidade && usuario?.estado && ` - ${usuario.cidade}, ${usuario.estado}`}
                </p>
              </div>
              <button
                onClick={() => setModalAberto('dados')}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-sm"
              >
                <Edit2 className="w-4 h-4" /> Editar Perfil
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Informacoes</h3>
            <div className="space-y-4">
              {[
                { icon: MapPin, value: usuario?.cidade && usuario?.estado ? `${usuario.cidade}, ${usuario.estado}` : 'Localizacao nao definida' },
                { icon: Mail, value: usuario?.email || auth.currentUser?.email || '' },
                { icon: Phone, value: usuario?.telefone || 'Telefone nao informado' },
                { icon: Calendar, value: usuario?.criadoEm ? `Membro desde ${formatarMesAno(usuario.criadoEm)}` : '' },
              ].map(({ icon: Icon, value }, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-sm truncate">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-700 space-y-1">
              <button
                onClick={() => setModalAberto('localizacao')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
              >
                <MapPin className="w-3.5 h-3.5" /> Atualizar localizacao
              </button>
              <button
                onClick={() => setModalAberto('senha')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <Lock className="w-3.5 h-3.5" /> Alterar senha
              </button>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-400 mb-4">Selo Sustenta</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className={`bg-gradient-to-br ${nivelCor} p-3 rounded-2xl shadow-lg`}>
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-emerald-900 dark:text-emerald-300 font-bold">{nivel.nome}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-xs">Nivel {nivel.nivel} de 10</p>
              </div>
            </div>
            <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 font-medium text-center">
              {nivel.xpAtual}/{nivel.xpTotal} XP para o proximo nivel
            </p>
          </div>

          {estatisticas && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Resumo Financeiro</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total registrado', value: moeda(estatisticas.totalGasto), icon: Wallet, cor: 'text-emerald-600' },
                  { label: 'Energia', value: moeda(estatisticas.energiaTotal), icon: Zap, cor: 'text-amber-500' },
                  { label: 'Agua', value: moeda(estatisticas.aguaTotal), icon: TrendingUp, cor: 'text-blue-500' },
                ].map(({ label, value, icon: Icon, cor }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${cor}`} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Registros', value: String(estatisticas?.totalRegistros ?? 0), icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/20', cor: 'text-blue-600 dark:text-blue-400' },
              { label: 'XP Total', value: String(xpTotal), icon: Trophy, bg: 'bg-amber-50 dark:bg-amber-900/20', cor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Meses', value: String(estatisticas?.mesesAtivos ?? 0), icon: Calendar, bg: 'bg-emerald-50 dark:bg-emerald-900/20', cor: 'text-emerald-600 dark:text-emerald-400' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.cor} flex items-center justify-center mx-auto mb-3`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{s.value}</p>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Informacoes de Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'E-mail', icon: Mail, value: usuario?.email || auth.currentUser?.email || '' },
                { label: 'Telefone', icon: Phone, value: usuario?.telefone || 'Nao informado' },
                { label: 'Localizacao', icon: MapPin, value: usuario?.cidade && usuario?.estado ? `${usuario.cidade}, ${NOME_POR_SIGLA[usuario.estado] || usuario.estado}` : 'Nao definida' },
              ].map(({ label, icon: Icon, value }) => (
                <div key={label} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-600 group hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">Sustentabilidade em Familia</h3>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/40 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl shadow-sm text-emerald-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300">
                      {grupo ? `${grupo.membros.length} membro${grupo.membros.length !== 1 ? 's' : ''} no grupo` : 'Modo Familia'}
                    </h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">Compartilhe metas e economize em familia.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('familia')}
                  className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Gerenciar Grupo
                </button>
              </div>
            </div>
          </div>

          <MedalhasCard medalhas={medalhas} />

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Historico de Conquistas Recentes</h3>
            {conquistas.length === 0 ? (
              <div className="text-center py-8">
                <Leaf className="w-10 h-10 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Registre consumos para ganhar conquistas!</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-700">
                {conquistas.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative pl-12">
                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white dark:bg-slate-700 border-4 border-slate-50 dark:border-slate-800 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.date}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full shrink-0 ml-3">+{item.pts} pts</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
