import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Droplets, Wallet, Plus, CheckCircle2, Loader2, Trash2, Pencil, X, Check, ChevronDown } from 'lucide-react';
import { db, auth } from '../../../../src/services/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const outrasOpcoes = [
  'Gás', 'Internet', 'Transporte', 'Alimentação', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Moradia', 'Outro'
];

interface Registro {
  id: string;
  categoria: string;
  subcategoria?: string;
  valor: number;
  mes: string;
  descricao: string;
}

function mesLabel(mes: string) {
  const [ano, m] = mes.split('-');
  return new Date(Number(ano), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export const ConsumptionPage: React.FC = () => {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [categoria, setCategoria]               = React.useState<'energia' | 'agua' | 'outro'>('energia');
  const [subcategoria, setSubcategoria]         = React.useState('');
  const [subcategoriaCustom, setSubcategoriaCustom] = React.useState('');
  const [valor, setValor]                       = React.useState('');
  const [descricao, setDescricao]               = React.useState('');
  const [mes, setMes]                           = React.useState(mesAtual);
  const [salvando, setSalvando]                 = React.useState(false);
  const [sucesso, setSucesso]                   = React.useState(false);
  const [erro, setErro]                         = React.useState('');
  const [registros, setRegistros]               = React.useState<Registro[]>([]);
  const [carregando, setCarregando]             = React.useState(true);
  const [editandoId, setEditandoId]             = React.useState<string | null>(null);
  const [editValor, setEditValor]               = React.useState('');
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

  const categoriaLabel = () => {
    if (categoria === 'energia') return 'Energia Elétrica';
    if (categoria === 'agua') return 'Água';
    if (subcategoria === 'Outro') return subcategoriaCustom || 'Outro';
    return subcategoria || 'Outro';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0)                        { setErro('Informe um valor válido.'); return; }
    if (categoria === 'outro' && !subcategoria)                  { setErro('Selecione uma subcategoria.'); return; }
    if (categoria === 'outro' && subcategoria === 'Outro' && !subcategoriaCustom.trim()) { setErro('Digite o nome da categoria.'); return; }
    setSalvando(true); setErro('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error();
      await addDoc(collection(db, 'registros'), {
        uid: user.uid,
        categoria,
        subcategoria: categoria === 'outro' ? (subcategoria === 'Outro' ? subcategoriaCustom : subcategoria) : null,
        valor: parseFloat(valor),
        descricao,
        mes,
        criadoEm: Timestamp.now(),
      });
      setSucesso(true);
      setValor(''); setDescricao(''); setSubcategoria(''); setSubcategoriaCustom('');
      setTimeout(() => setSucesso(false), 3000);
      carregarRegistros();
    } catch { setErro('Erro ao salvar. Tente novamente.'); }
    setSalvando(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este registro?')) return;
    await deleteDoc(doc(db, 'registros', id));
    carregarRegistros();
  };

  const handleEdit = (r: Registro) => {
    setEditandoId(r.id);
    setEditValor(String(r.valor));
    setEditDescricao(r.descricao);
  };

  const handleSaveEdit = async (id: string) => {
    await updateDoc(doc(db, 'registros', id), { valor: parseFloat(editValor), descricao: editDescricao });
    setEditandoId(null);
    carregarRegistros();
  };

  const badgeColor: Record<string, string> = {
    energia: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    agua:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    outro:   'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  };

  const registroLabel = (r: Registro) => {
    if (r.categoria === 'energia') return 'Energia Elétrica';
    if (r.categoria === 'agua') return 'Água';
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { id: 'energia' as const, label: 'Energia Elétrica', icon: Zap      },
            { id: 'agua'   as const, label: 'Água',              icon: Droplets },
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
          {categoria === 'outro' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Tipo de gasto</label>
              <div className="relative">
                <select value={subcategoria} onChange={e => { setSubcategoria(e.target.value); setSubcategoriaCustom(''); }}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 appearance-none bg-white dark:bg-slate-700 pr-10">
                  <option value="">Selecione uma categoria...</option>
                  {outrasOpcoes.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              <AnimatePresence>
                {subcategoria === 'Outro' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <input type="text" value={subcategoriaCustom} onChange={e => setSubcategoriaCustom(e.target.value)}
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
              <input type="number" min="0" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 text-lg font-bold bg-white dark:bg-slate-700"
                placeholder="0,00" />
            </div>
          </div>

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
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
              placeholder={`Ex: Conta de ${categoriaLabel()} de ${mesLabel(mes)}`} />
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
              const IconMap: Record<string, React.ElementType> = { energia: Zap, agua: Droplets };
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
                        <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)}
                          className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                        <input type="text" value={editDescricao} onChange={e => setEditDescricao(e.target.value)}
                          className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Descrição" />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {registroLabel(r)} — <span className="text-emerald-600 dark:text-emerald-400">R$ {r.valor.toFixed(2)}</span>
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
                        <button onClick={() => handleSaveEdit(r.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditandoId(null)} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4" /></button>
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