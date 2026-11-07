import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Droplets, Car, Wallet, Plus, CheckCircle2, Loader2, Trash2, Pencil, X, Check, ChevronDown } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { useFeedback } from '../contexts/FeedbackContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { LIMITES, limparTexto, validarMes, validarQuantidade, validarValor } from '../../services/validacao';
import { TIPOS_TRANSPORTE, unidadeDeQuantidade } from '../../services/transporte';

const outrasOpcoes = [
  'Gás', 'Internet', 'Alimentação', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Moradia', 'Outro'
];

interface Registro {
  id: string;
  categoria: string;
  subcategoria?: string;
  valor: number;
  quantidade?: number | null;
  mes: string;
  descricao: string;
}

function mesLabel(mes: string) {
  const [ano, m] = mes.split('-');
  return new Date(Number(ano), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export const ConsumptionPage: React.FC = () => {
  const { confirmar } = useFeedback();
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [categoria, setCategoria]               = React.useState<'energia' | 'agua' | 'transporte' | 'outro'>('energia');
  const [subcategoria, setSubcategoria]         = React.useState('');
  const [subcategoriaCustom, setSubcategoriaCustom] = React.useState('');
  const [valor, setValor]                       = React.useState('');
  const [quantidade, setQuantidade]             = React.useState('');
  const [descricao, setDescricao]               = React.useState('');
  const [mes, setMes]                           = React.useState(mesAtual);
  const [salvando, setSalvando]                 = React.useState(false);
  const [sucesso, setSucesso]                   = React.useState(false);
  const [erro, setErro]                         = React.useState('');
  const [erroEdicao, setErroEdicao]             = React.useState('');
  const [registros, setRegistros]               = React.useState<Registro[]>([]);
  const [carregando, setCarregando]             = React.useState(true);
  const [editandoId, setEditandoId]             = React.useState<string | null>(null);
  const [editValor, setEditValor]               = React.useState('');
  const [editQuantidade, setEditQuantidade]     = React.useState('');
  const [editDescricao, setEditDescricao]       = React.useState('');

  const carregarRegistros = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setCarregando(true);
    const q = query(collection(db, 'registros'), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Registro));
    docs.sort((a, b) => b.mes.localeCompare(a.mes));
    setRegistros(docs);
    setCarregando(false);
  };

  React.useEffect(() => { carregarRegistros(); }, []);

  // kWh (energia), m³ (água), litros (combustível) ou m³ (GNV). Demais tipos não têm quantidade.
  const unidade = unidadeDeQuantidade(categoria, subcategoria);
  const lerQuantidade = (texto: string) => (texto.trim() === '' ? null : parseFloat(texto));

  const categoriaLabel = () => {
    if (categoria === 'energia') return 'Energia Elétrica';
    if (categoria === 'agua') return 'Água';
    if (categoria === 'transporte' && subcategoria !== 'Outro') return subcategoria ? `Transporte: ${subcategoria}` : 'Transporte';
    if (subcategoria === 'Outro') return subcategoriaCustom || 'Outro';
    return subcategoria || 'Outro';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erroValor = validarValor(parseFloat(valor));
    if (erroValor)                                               { setErro(erroValor); return; }
    const erroMes = validarMes(mes);
    if (erroMes)                                                 { setErro(erroMes); return; }
    const quantidadeNum = unidade ? lerQuantidade(quantidade) : null;
    const erroQuantidade = validarQuantidade(quantidadeNum);
    if (erroQuantidade)                                          { setErro(erroQuantidade); return; }
    if ((categoria === 'outro' || categoria === 'transporte') && !subcategoria) { setErro(categoria === 'transporte' ? 'Selecione o tipo de transporte.' : 'Selecione uma subcategoria.'); return; }
    if ((categoria === 'outro' || categoria === 'transporte') && subcategoria === 'Outro' && !subcategoriaCustom.trim()) { setErro('Digite o nome da categoria.'); return; }
    setSalvando(true); setErro('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error();
      await addDoc(collection(db, 'registros'), {
        uid: user.uid,
        categoria,
        subcategoria: categoria === 'outro' || categoria === 'transporte'
          ? limparTexto(subcategoria === 'Outro' ? subcategoriaCustom : subcategoria, LIMITES.subcategoria)
          : null,
        valor: parseFloat(valor),
        ...(quantidadeNum !== null ? { quantidade: quantidadeNum } : {}),
        descricao: limparTexto(descricao, LIMITES.descricao),
        mes,
        criadoEm: serverTimestamp(),
      });
      setSucesso(true);
      setValor(''); setQuantidade(''); setDescricao(''); setSubcategoria(''); setSubcategoriaCustom('');
      setTimeout(() => setSucesso(false), 3000);
      carregarRegistros();
    } catch { setErro('Erro ao salvar. Tente novamente.'); }
    setSalvando(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmar({ titulo: 'Deletar registro', mensagem: 'Deletar este registro?', textoConfirmar: 'Deletar', perigo: true }))) return;
    await deleteDoc(doc(db, 'registros', id));
    carregarRegistros();
  };

  const handleEdit = (r: Registro) => {
    setErroEdicao('');
    setEditandoId(r.id);
    setEditValor(String(r.valor));
    setEditQuantidade(r.quantidade != null ? String(r.quantidade) : '');
    setEditDescricao(r.descricao);
  };

  const handleSaveEdit = async (r: Registro) => {
    const id = r.id;
    const novoValor = parseFloat(editValor);
    const erroValor = validarValor(novoValor);
    if (erroValor) { setErroEdicao(erroValor); return; }
    const unidadeEdicao = unidadeDeQuantidade(r.categoria, r.subcategoria);
    const novaQuantidade = unidadeEdicao ? lerQuantidade(editQuantidade) : null;
    const erroQuantidade = validarQuantidade(novaQuantidade);
    if (erroQuantidade) { setErroEdicao(erroQuantidade); return; }
    try {
      await updateDoc(doc(db, 'registros', id), {
        valor: novoValor,
        ...(unidadeEdicao ? { quantidade: novaQuantidade } : {}),
        descricao: limparTexto(editDescricao, LIMITES.descricao),
      });
    } catch {
      setErroEdicao('Erro ao salvar. Tente novamente.');
      return;
    }
    setErroEdicao('');
    setEditandoId(null);
    carregarRegistros();
  };

  const badgeColor: Record<string, string> = {
    energia: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    agua:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    transporte: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    outro:   'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  };

  const registroLabel = (r: Registro) => {
    if (r.categoria === 'energia') return 'Energia Elétrica';
    if (r.categoria === 'agua') return 'Água';
    if (r.categoria === 'transporte') return r.subcategoria ? `Transporte: ${r.subcategoria}` : 'Transporte';
    return r.subcategoria || 'Outro';
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Registrar Consumo</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Adicione seus gastos mensais para acompanhar seu impacto.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-8"
      >
        {/* Seletor de categoria */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { id: 'energia' as const, label: 'Energia Elétrica', icon: Zap      },
            { id: 'agua'   as const, label: 'Água',              icon: Droplets },
            { id: 'transporte' as const, label: 'Transporte',    icon: Car      },
            { id: 'outro'  as const, label: 'Outros',            icon: Wallet   },
          ].map(cat => {
            const Icon = cat.icon;
            const isActive = categoria === cat.id;
            return (
              <button key={cat.id}
                onClick={() => { setCategoria(cat.id); setSubcategoria(''); setSubcategoriaCustom(''); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${isActive
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
                  }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold text-center">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subcategoria */}
        <AnimatePresence>
          {(categoria === 'outro' || categoria === 'transporte') && (
            <motion.div key={categoria} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">{categoria === 'transporte' ? 'Tipo de transporte' : 'Tipo de gasto'}</label>
              <div className="relative">
                <select value={subcategoria} onChange={e => { setSubcategoria(e.target.value); setSubcategoriaCustom(''); }}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700 pr-10">
                  <option value="">{categoria === 'transporte' ? 'Selecione o tipo...' : 'Selecione uma categoria...'}</option>
                  {(categoria === 'transporte' ? [...TIPOS_TRANSPORTE] : outrasOpcoes).map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              <AnimatePresence>
                {subcategoria === 'Outro' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <input type="text" maxLength={LIMITES.subcategoria} value={subcategoriaCustom} onChange={e => setSubcategoriaCustom(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
                      placeholder="Digite o nome da categoria..." />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Valor */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Valor (R$)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">R$</span>
              <input type="number" min="0.01" max={LIMITES.valorMax} step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 text-lg font-bold bg-white dark:bg-slate-700"
                placeholder="0,00" />
            </div>
          </div>

          {/* Quantidade (opcional): deixa a pegada de carbono mais precisa */}
          {unidade && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                Quantidade ({categoria === 'transporte' ? 'abastecida' : 'consumida'}, em {unidade}) <span className="text-slate-400 font-normal">— opcional</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">{unidade}</span>
                <input type="number" min="0.01" max={LIMITES.quantidadeMax} step="0.01" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                  className="w-full pl-16 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold bg-white dark:bg-slate-700"
                  placeholder={categoria === 'energia' ? 'Ex.: 150 (está na sua conta de luz)' : categoria === 'agua' ? 'Ex.: 12 (está na sua conta de água)' : 'Ex.: 40 (está no cupom do posto)'} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                {categoria === 'transporte'
                  ? 'Com os litros (ou m³), a pegada de carbono usa o fator do combustível. Sem a quantidade, este gasto fica fora do cálculo de carbono.'
                  : 'Com a quantidade, a pegada de carbono usa o fator oficial em vez de uma estimativa pelo valor em reais.'}
              </p>
            </div>
          )}

          {/* Mês */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Mês de referência</label>
            <div className="relative">
              <div className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700">
                {mesLabel(mes)}
              </div>
              <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Descrição (opcional)</label>
            <input type="text" maxLength={LIMITES.descricao} value={descricao} onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
              placeholder={categoria === 'transporte' ? `Ex: ${categoriaLabel()} de ${mesLabel(mes)}` : `Ex: Conta de ${categoriaLabel()} de ${mesLabel(mes)}`} />
          </div>

          {erro && (
            <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 px-4 py-3 rounded-xl">
              {erro}
            </p>
          )}

          <AnimatePresence>
            {sucesso && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Gasto registrado com sucesso!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={salvando}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-60">
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {salvando ? 'Salvando...' : 'Registrar Gasto'}
          </button>
        </form>
      </motion.div>

      {/* Histórico */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Histórico de Registros</h2>
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-slate-400 dark:text-slate-500">
            Nenhum registro ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {registros.map(r => {
              const isEditando = editandoId === r.id;
              const IconMap: Record<string, React.ElementType> = { energia: Zap, agua: Droplets, transporte: Car };
              const Icon = IconMap[r.categoria] ?? Wallet;
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className={`p-2.5 rounded-xl ${badgeColor[r.categoria] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditando ? (
                      <div className="flex gap-2 flex-wrap">
                        <input type="number" min="0.01" max={LIMITES.valorMax} step="0.01" value={editValor} onChange={e => { setEditValor(e.target.value); setErroEdicao(''); }}
                          className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                        {unidadeDeQuantidade(r.categoria, r.subcategoria) && (
                          <input type="number" min="0.01" max={LIMITES.quantidadeMax} step="0.01" value={editQuantidade} onChange={e => { setEditQuantidade(e.target.value); setErroEdicao(''); }}
                            aria-label={`Quantidade em ${unidadeDeQuantidade(r.categoria, r.subcategoria)}`} placeholder={unidadeDeQuantidade(r.categoria, r.subcategoria) ?? ''}
                            className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                        )}
                        <input type="text" maxLength={LIMITES.descricao} value={editDescricao} onChange={e => setEditDescricao(e.target.value)}
                          className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Descrição" />
                        {erroEdicao && (
                          <p role="alert" className="w-full text-red-500 dark:text-red-400 text-xs">{erroEdicao}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {registroLabel(r)} — <span className="text-emerald-600 dark:text-emerald-400">R$ {r.valor.toFixed(2)}</span>
                          {r.quantidade != null && unidadeDeQuantidade(r.categoria, r.subcategoria) && (
                            <span className="text-slate-500 dark:text-slate-400 font-medium"> • {r.quantidade.toLocaleString('pt-BR')} {unidadeDeQuantidade(r.categoria, r.subcategoria)}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {mesLabel(r.mes)}{r.descricao ? ` • ${r.descricao}` : ''}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditando ? (
                      <>
                        <button onClick={() => handleSaveEdit(r)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setEditandoId(null); setErroEdicao(''); }} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};