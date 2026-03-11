import React from 'react';
import { motion } from 'motion/react';
import { Zap, Droplets, Wallet, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const categorias = [
  { id: 'energia', label: 'Energia Elétrica', icon: Zap, color: 'amber', unit: 'R$' },
  { id: 'agua', label: 'Consumo de Água', icon: Droplets, color: 'blue', unit: 'R$' },
  { id: 'outro', label: 'Outro Gasto', icon: Wallet, color: 'indigo', unit: 'R$' },
];

export const ConsumptionPage: React.FC = () => {
  const [categoria, setCategoria] = React.useState('energia');
  const [valor, setValor] = React.useState('');
  const [descricao, setDescricao] = React.useState('');
  const [mes, setMes] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salvando, setSalvando] = React.useState(false);
  const [sucesso, setSucesso] = React.useState(false);
  const [erro, setErro] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valor || parseFloat(valor) <= 0) {
      setErro('Informe um valor válido.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');
      await addDoc(collection(db, 'registros'), {
        uid: user.uid,
        categoria,
        valor: parseFloat(valor),
        descricao,
        mes,
        criadoEm: Timestamp.now(),
      });
      setSucesso(true);
      setValor('');
      setDescricao('');
      setTimeout(() => setSucesso(false), 3000);
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    }
    setSalvando(false);
  };

  const catAtual = categorias.find(c => c.id === categoria)!;
  const IconAtual = catAtual.icon;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Registrar Consumo</h1>
        <p className="text-slate-500 mt-1">Adicione seus gastos mensais para acompanhar seu impacto.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        
        {/* Seletor de categoria */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {categorias.map(cat => {
            const Icon = cat.icon;
            const isActive = categoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(cat.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold text-center leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Valor */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Valor (R$)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 font-bold">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={valor}
                onChange={e => setValor(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-lg font-bold"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Mês de referência */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Mês de referência</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Descrição (opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
              placeholder={`Ex: Conta de ${catAtual.label} de ${mes}`}
            />
          </div>

          {erro && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{erro}</p>}

          {sucesso && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Gasto registrado com sucesso!</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-60"
          >
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {salvando ? 'Salvando...' : 'Registrar Gasto'}
          </button>
        </form>
      </motion.div>

      {/* Info card */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 p-2.5 rounded-xl">
            <IconAtual className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900">Dica Sustenta 🌿</h3>
            <p className="text-emerald-700 text-sm mt-1">
              {categoria === 'energia' && 'Registrar sua conta de energia todo mês ajuda a identificar picos de consumo e economizar até 30% na conta!'}
              {categoria === 'agua' && 'Monitorar o consumo de água ajuda a detectar vazamentos e reduzir o desperdício. Cada litro conta!'}
              {categoria === 'outro' && 'Registre todos os gastos para ter uma visão completa do seu impacto financeiro e ambiental mensal.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};