import { Plus, Trash2, Loader2, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../../../services/firebase';
import { NIVEIS_CORES, iniciais, moeda } from './auxiliares';
import type { PerfilCtx } from './usePerfil';

export function FamiliaTab(p: PerfilCtx) {
  const { grupo, carregandoGrupo, codigoEntrada, setCodigoEntrada, nomeNovoGrupo, setNomeNovoGrupo, setModalConvite, salvando, handleCriarGrupo, handleEntrarGrupo, handleRemoverMembro, isDono, membrosOrdenados, maiorXp, totalGrupoGasto, totalGrupoEnergia, totalGrupoAgua } = p;
  return (
    <motion.div
      key="familia"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          {carregandoGrupo ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : !grupo ? (
            <div className="space-y-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Modo Familia</h3>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Criar novo grupo</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nome do grupo (ex: Familia Silva)"
                    value={nomeNovoGrupo}
                    onChange={(e) => setNomeNovoGrupo(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <button
                    onClick={handleCriarGrupo}
                    disabled={salvando}
                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Criar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ou</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Entrar com codigo de convite</h4>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Cole o codigo aqui (ex: AB12CD34)"
                    value={codigoEntrada}
                    onChange={(e) => setCodigoEntrada(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-mono tracking-widest"
                  />
                  <button
                    onClick={handleEntrarGrupo}
                    disabled={salvando}
                    className="px-6 py-3 bg-slate-800 dark:bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-60"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{grupo.nome}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{grupo.membros.length}/5 membros</p>
                </div>

                {isDono && (
                  <button
                    onClick={() => setModalConvite(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-200"
                  >
                    <Share2 className="w-4 h-4" /> Convidar
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {grupo.membros.map((membro) => {
                  const dados = membro.dados;

                  return (
                    <div
                      key={membro.uid}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${NIVEIS_CORES[0]} flex items-center justify-center shadow-sm`}>
                          <span className="text-white font-black text-sm">{iniciais(membro.nome)}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 transition-colors">
                            {membro.nome}
                            {membro.role === 'dono' && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Dono</span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{membro.email}</p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {dados?.podeVerNivel && dados.nivel !== undefined && (
                              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                Nivel {dados.nivel} - {dados.nomeNivel}
                              </span>
                            )}
                            {dados?.podeVerGastos && dados.totalGasto !== undefined && (
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                {moeda(dados.totalGasto)} registrados
                              </span>
                            )}
                            {dados?.podeVerConquistas && dados.conquistas !== undefined && (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                {dados.conquistas} conquistas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">{membro.xp} XP</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Impacto</p>
                        </div>

                        {isDono && membro.uid !== auth.currentUser?.uid && (
                          <button
                            onClick={() => handleRemoverMembro(membro.uid)}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {grupo.membros.length < 5 && isDono && (
                <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 text-center">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Ainda {5 - grupo.membros.length} vaga{5 - grupo.membros.length !== 1 ? 's' : ''} disponivel{5 - grupo.membros.length !== 1 ? 'is' : ''}
                  </p>
                  <button onClick={() => setModalConvite(true)} className="mt-3 text-emerald-600 font-bold text-xs hover:underline">
                    Convidar mais membros
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Metricas do Grupo</h3>

          {grupo ? (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase">Membros</span>
                  <span className="text-xs font-black text-emerald-600">{grupo.membros.length}/5</span>
                </div>
                <div className="w-full h-2 bg-white dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(grupo.membros.length / 5) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gasto visivel do grupo</p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">{moeda(totalGrupoGasto)}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Soma apenas membros que liberaram gastos.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Energia</p>
                    <p className="text-sm font-black text-amber-500">{moeda(totalGrupoEnergia)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Agua</p>
                    <p className="text-sm font-black text-blue-500">{moeda(totalGrupoAgua)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {membrosOrdenados.map((m, i) => (
                  <div key={m.uid} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.nome}</p>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: maiorXp > 0 ? `${(m.xp / maiorXp) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">{m.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
              Crie ou entre em um grupo para ver as metricas
            </p>
          )}
        </div>

        <div className="p-6 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-200">
          <h4 className="font-bold text-lg mb-2">Desafio Familiar</h4>
          <p className="text-[10px] text-emerald-100 leading-relaxed mb-4">
            Convide membros para economizar juntos e ganhar bonus de XP compartilhados.
          </p>
          {grupo && (
            <div className="flex items-center gap-2">
              <div className="w-full h-2 bg-emerald-800 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${(grupo.membros.length / 5) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold shrink-0">{grupo.membros.length}/5</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
