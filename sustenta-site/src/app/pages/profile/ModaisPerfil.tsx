import { User, MapPin, Phone, Trophy, Users, Award, Lock, Info, Trash2, Save, X, Loader2, CheckCircle2, AlertCircle, Wallet, Copy, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compartilharWhatsApp, compartilharInstagram, compartilharX, compartilharEmail } from '../../../services/familia';
import { contaUsaSenha } from '../../../services/conta';
import { Campo } from './Campo';
import type { PerfilCtx } from './usePerfil';

export function ModaisPerfil(p: PerfilCtx) {
  const { grupo, linkCopiado, modalConvite, setModalConvite, modalAberto, formNome, setFormNome, formTelefone, setFormTelefone, formEstado, setFormEstado, formCidade, setFormCidade, senhaAtual, setSenhaAtual, novaSenha, setNovaSenha, confirmarSenha, setConfirmarSenha, salvando, erro, modal2FA, setModal2FA, modalExcluir, setModalExcluir, senhaExclusao, setSenhaExclusao, confirmacaoExclusao, setConfirmacaoExclusao, excluindo, enviando2FA, verificando2FA, linkEnviado, modalDados, setModalDados, salvandoDados, dadosCompartilhados, setDadosCompartilhados, ok, fecharModal, salvarDados, salvarLocalizacao, salvarSenha, handleExcluirConta, handleEnviarVerificacao, handleVerificarEmail, handleSalvarDados, handleRegenerarCodigo, handleCopiarLink, linkConvite } = p;
  return (
    <>
      <AnimatePresence>
        {modalConvite && grupo && (
          <>
            <motion.div
              key="ov2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setModalConvite(false)}
            />
            <motion.div
              key="mc"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Convidar para {grupo.nome}</h3>
                  <button onClick={() => setModalConvite(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Codigo de convite</p>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600">
                      <span className="flex-1 text-2xl font-black text-slate-800 dark:text-slate-100 tracking-[0.3em] text-center">{grupo.codigoConvite}</span>
                      <button onClick={handleRegenerarCodigo} disabled={salvando} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Gerar novo codigo">
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">Compartilhe este codigo para que alguem entre no grupo</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link de convite</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                      <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">{linkConvite}</span>
                      <button onClick={handleCopiarLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${linkCopiado ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'}`}>
                        {linkCopiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {linkCopiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Compartilhar via</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => compartilharWhatsApp(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl text-sm font-bold text-emerald-600">
                        WhatsApp
                      </button>
                      <button onClick={() => { compartilharInstagram(linkConvite); ok('Link copiado! Cole no Instagram.'); }} className="flex items-center justify-center gap-2 p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/40 rounded-2xl text-sm font-bold text-pink-600">
                        Instagram
                      </button>
                      <button onClick={() => compartilharX(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200">
                        X/Twitter
                      </button>
                      <button onClick={() => compartilharEmail(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl text-sm font-bold text-blue-600">
                        E-mail
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalDados && (
          <>
            <motion.div
              key="ov-dados"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setModalDados(false)}
            />
            <motion.div
              key="mod-dados"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Dados Compartilhados</h3>
                  </div>
                  <button onClick={() => setModalDados(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Escolha quais informacoes os membros do seu grupo familiar podem visualizar:
                  </p>

                  {[
                    { key: 'gastos', label: 'Gastos mensais', desc: 'Energia, agua e outros gastos', icon: Wallet },
                    { key: 'nivel', label: 'Nivel e XP', desc: 'Seu progresso e ranking no grupo', icon: Trophy },
                    { key: 'conquistas', label: 'Conquistas', desc: 'Historico de metas alcancadas', icon: Award },
                  ].map(({ key, label, desc, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
                        </div>
                      </div>
                      <div
                        onClick={() => setDadosCompartilhados((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${dadosCompartilhados[key as keyof typeof dadosCompartilhados] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${dadosCompartilhados[key as keyof typeof dadosCompartilhados] ? 'translate-x-6' : ''}`} />
                      </div>
                    </div>
                  ))}

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Essas configuracoes so afetam membros do seu grupo familiar. Seus dados nunca sao compartilhados publicamente.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setModalDados(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                      Cancelar
                    </button>
                    <button onClick={handleSalvarDados} disabled={salvandoDados} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60">
                      {salvandoDados ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal2FA && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal2FA(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Verificacao de E-mail</h3>
                  <button onClick={() => setModal2FA(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Envie um link de verificacao para seu e-mail e depois clique em verificar.
                </p>
                {linkEnviado && (
                  <p className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                    Link enviado. Verifique sua caixa de entrada.
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={handleEnviarVerificacao} disabled={enviando2FA} className="flex-1 py-3 bg-slate-800 dark:bg-slate-600 text-white rounded-2xl font-bold text-sm">
                    {enviando2FA ? 'Enviando...' : 'Enviar link'}
                  </button>
                  <button onClick={handleVerificarEmail} disabled={verificando2FA} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm">
                    {verificando2FA ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalExcluir && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !excluindo && setModalExcluir(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-red-600 dark:text-red-400">Excluir conta</h3>
                  <button onClick={() => setModalExcluir(false)} disabled={excluindo} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Isso apaga permanentemente seu perfil, registros de consumo, habitos, posicao no ranking e sua participacao no grupo familiar
                  (se voce for o dono, o grupo sera excluido). Nao da para desfazer.
                </p>
                {contaUsaSenha() ? (
                  <Campo label="Sua senha" icon={Lock} value={senhaExclusao} onChange={setSenhaExclusao} type="password" />
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Vamos pedir para voce confirmar com sua conta Google.</p>
                )}
                <Campo label='Digite "EXCLUIR" para confirmar' icon={AlertCircle} value={confirmacaoExclusao} onChange={setConfirmacaoExclusao} placeholder="EXCLUIR" />
                {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setModalExcluir(false)} disabled={excluindo} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleExcluirConta} disabled={excluindo} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm disabled:opacity-60">
                    {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Excluir definitivamente
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalAberto && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={fecharModal} />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {modalAberto === 'dados' ? 'Editar Perfil' : modalAberto === 'localizacao' ? 'Atualizar Localizacao' : 'Alterar Senha'}
                  </h3>
                  <button onClick={fecharModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {modalAberto === 'dados' && (
                    <>
                      <Campo label="Nome" icon={User} value={formNome} onChange={setFormNome} placeholder="Seu nome" />
                      <Campo label="Telefone" icon={Phone} value={formTelefone} onChange={setFormTelefone} placeholder="Seu telefone" />
                    </>
                  )}

                  {modalAberto === 'localizacao' && (
                    <>
                      <Campo label="Estado" icon={MapPin} value={formEstado} onChange={(v) => setFormEstado(v.toUpperCase())} placeholder="Ex: SP" />
                      <Campo label="Cidade" icon={MapPin} value={formCidade} onChange={setFormCidade} placeholder="Ex: Sumare" />
                    </>
                  )}

                  {modalAberto === 'senha' && (
                    <>
                      <Campo label="Senha atual" icon={Lock} value={senhaAtual} onChange={setSenhaAtual} type="password" />
                      <Campo label="Nova senha" icon={Lock} value={novaSenha} onChange={setNovaSenha} type="password" />
                      <Campo label="Confirmar senha" icon={Lock} value={confirmarSenha} onChange={setConfirmarSenha} type="password" />
                    </>
                  )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={fecharModal} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={modalAberto === 'dados' ? salvarDados : modalAberto === 'localizacao' ? salvarLocalizacao : salvarSenha}
                    disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
