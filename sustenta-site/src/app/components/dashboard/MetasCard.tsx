import React from 'react';
import { Target, Zap, Droplets, Wallet, Pencil, Check, X, Loader2 } from 'lucide-react';
import { useFeedback } from '../../contexts/FeedbackContext';
import {
  buscarMetas, salvarMetas, calcularProgresso, validarMeta,
  CATEGORIAS_META, type CategoriaMeta, type Metas, type StatusMeta,
} from '../../../services/metas';

interface MetasCardProps {
  gastos: Record<CategoriaMeta, number>;
  mesLabel: string;
}

const ROTULO: Record<CategoriaMeta, string> = { energia: 'Energia', agua: 'Água', outro: 'Outros gastos' };
const ICONE: Record<CategoriaMeta, React.ElementType> = { energia: Zap, agua: Droplets, outro: Wallet };

const COR_BARRA: Record<StatusMeta, string> = {
  ok: 'bg-emerald-500',
  atencao: 'bg-amber-500',
  estourou: 'bg-red-500',
};

const TEXTO_STATUS: Record<StatusMeta, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  estourou: 'text-red-600 dark:text-red-400',
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const MetasCard: React.FC<MetasCardProps> = ({ gastos, mesLabel }) => {
  const { avisar } = useFeedback();
  const [metas, setMetas] = React.useState<Metas>({});
  const [carregando, setCarregando] = React.useState(true);
  const [editando, setEditando] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [campos, setCampos] = React.useState<Record<CategoriaMeta, string>>({ energia: '', agua: '', outro: '' });
  const [erros, setErros] = React.useState<Partial<Record<CategoriaMeta, string>>>({});

  React.useEffect(() => {
    let ativo = true;
    buscarMetas()
      .then((m) => { if (ativo) setMetas(m); })
      .catch(() => { if (ativo) avisar('Não foi possível carregar suas metas.', 'erro'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [avisar]);

  const comecarEdicao = () => {
    setCampos({
      energia: metas.energia != null ? String(metas.energia) : '',
      agua: metas.agua != null ? String(metas.agua) : '',
      outro: metas.outro != null ? String(metas.outro) : '',
    });
    setErros({});
    setEditando(true);
  };

  const salvar = async () => {
    const novosErros: Partial<Record<CategoriaMeta, string>> = {};
    for (const cat of CATEGORIAS_META) {
      const erro = validarMeta(campos[cat]);
      if (erro) novosErros[cat] = erro;
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const novas: Metas = {};
    for (const cat of CATEGORIAS_META) {
      if (campos[cat].trim() !== '') novas[cat] = parseFloat(campos[cat].replace(',', '.'));
    }

    setSalvando(true);
    try {
      await salvarMetas(novas);
      setMetas(novas);
      setEditando(false);
      avisar('Metas salvas.', 'sucesso');
    } catch {
      avisar('Não foi possível salvar as metas. Tente novamente.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const temMeta = CATEGORIAS_META.some((c) => metas[c] != null);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <Target className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Metas do mês</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Seus gastos de {mesLabel} em relação ao limite que você definiu.</p>
          </div>
        </div>
        {!editando && !carregando && (
          <button
            type="button"
            onClick={comecarEdicao}
            className="shrink-0 whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            {temMeta ? 'Editar metas' : 'Definir metas'}
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" aria-label="Carregando metas" />
        </div>
      ) : editando ? (
        <form
          onSubmit={(e) => { e.preventDefault(); void salvar(); }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Informe o máximo que quer gastar por mês em cada categoria. Deixe vazio para não ter meta.
          </p>
          {CATEGORIAS_META.map((cat) => {
            const Icone = ICONE[cat];
            const idCampo = `meta-${cat}`;
            return (
              <div key={cat}>
                <label htmlFor={idCampo} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Icone className="w-4 h-4" aria-hidden="true" /> {ROTULO[cat]}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">R$</span>
                  <input
                    id={idCampo}
                    type="text"
                    inputMode="decimal"
                    value={campos[cat]}
                    onChange={(e) => setCampos((c) => ({ ...c, [cat]: e.target.value }))}
                    aria-invalid={!!erros[cat]}
                    aria-describedby={erros[cat] ? `${idCampo}-erro` : undefined}
                    placeholder="Sem meta"
                    className="w-40 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700"
                  />
                </div>
                {erros[cat] && (
                  <p id={`${idCampo}-erro`} role="alert" className="mt-1 text-xs text-red-500 dark:text-red-400">{erros[cat]}</p>
                )}
              </div>
            );
          })}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-xl disabled:opacity-60"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" aria-hidden="true" /> Cancelar
            </button>
          </div>
        </form>
      ) : !temMeta ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Você ainda não definiu metas. Escolha um limite mensal para energia, água ou outros gastos e acompanhe aqui.
        </p>
      ) : (
        <div className="space-y-5">
          {CATEGORIAS_META.filter((cat) => metas[cat] != null).map((cat) => {
            const meta = metas[cat] as number;
            const gasto = gastos[cat];
            const prog = calcularProgresso(gasto, meta);
            const Icone = ICONE[cat];
            return (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <Icone className="w-4 h-4" aria-hidden="true" /> {ROTULO[cat]}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {brl(gasto)} de {brl(meta)}
                  </span>
                </div>
                <div
                  className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label={`Meta de ${ROTULO[cat]}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(prog.percentual, 100)}
                >
                  <div
                    className={`h-full rounded-full transition-all ${COR_BARRA[prog.status]}`}
                    style={{ width: `${Math.min(prog.percentual, 100)}%` }}
                  />
                </div>
                <p className={`mt-1 text-xs font-medium ${TEXTO_STATUS[prog.status]}`}>
                  {prog.status === 'estourou'
                    ? `Meta ultrapassada em ${brl(Math.abs(prog.restante))} (${prog.percentual}%).`
                    : prog.status === 'atencao'
                      ? `Atenção: ${prog.percentual}% da meta usada. Restam ${brl(prog.restante)}.`
                      : `${prog.percentual}% da meta usada. Restam ${brl(prog.restante)}.`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
