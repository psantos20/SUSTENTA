import { useMemo, useState } from 'react';
import { Route } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DIAS_MAXIMO,
  FONTE_MODAIS,
  KM_MAXIMO,
  MAX_PESSOAS_NO_CARRO,
  compararModais,
  lerNumero,
} from './modais';

const kg = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: v > 0 && v < 10 ? 1 : 0, maximumFractionDigits: 1 })} kg`;

export function ComparadorTransporte() {
  // Tema pelo contexto (igual à página de Educação): não depende de variantes dark: do CSS.
  const { darkMode } = useTheme();
  const [km, setKm] = useState('10');
  const [dias, setDias] = useState('22');
  const [idaEVolta, setIdaEVolta] = useState(true);
  const [pessoas, setPessoas] = useState(1);

  const kmNumero = lerNumero(km, KM_MAXIMO);
  const diasNumero = lerNumero(dias, DIAS_MAXIMO);
  const valido = kmNumero !== null && diasNumero !== null;

  const linhas = useMemo(
    () =>
      valido
        ? compararModais({ km: kmNumero, diasPorMes: diasNumero, idaEVolta, pessoasNoCarro: pessoas })
        : [],
    [valido, kmNumero, diasNumero, idaEVolta, pessoas]
  );

  const maior = Math.max(...linhas.map((l) => l.kgMes), 0);

  const t = {
    cartao: darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
    titulo: darkMode ? 'text-white' : 'text-slate-900',
    suave: darkMode ? 'text-slate-400' : 'text-slate-500',
    texto: darkMode ? 'text-slate-200' : 'text-slate-800',
    campo: darkMode
      ? 'bg-white/10 border-white/10 text-white focus:border-emerald-400/60'
      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500',
    opcao: 'text-slate-900',
    linha: darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50',
    trilho: darkMode ? 'bg-white/10' : 'bg-slate-100',
    barra: darkMode ? 'bg-emerald-400' : 'bg-emerald-500',
    bom: darkMode ? 'text-emerald-400' : 'text-emerald-600',
    aviso: darkMode ? 'text-amber-300' : 'text-amber-600',
    iconeBg: darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    selo: darkMode ? 'text-emerald-400 bg-emerald-500/15' : 'text-emerald-700 bg-emerald-100',
    checkbox: darkMode ? 'text-slate-300' : 'text-slate-700',
  };
  const campo = clsx('w-full border text-sm font-medium px-3 py-2.5 rounded-xl outline-none', t.campo);

  return (
    <div className={clsx('rounded-2xl border p-5 space-y-4', t.cartao)}>
      <div className="flex items-center gap-2.5">
        <div className={clsx('p-2 rounded-xl', t.iconeBg)}>
          <Route className="w-4 h-4" />
        </div>
        <div>
          <p className={clsx('text-sm font-bold', t.titulo)}>Comparador de transporte</p>
          <p className={clsx('text-xs', t.suave)}>Quanto de CO₂ o mesmo trajeto emite em cada meio de transporte.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className={clsx('text-[11px] font-medium uppercase tracking-wider', t.suave)}>Distância (km)</span>
          <input
            inputMode="decimal"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            aria-invalid={kmNumero === null}
            data-testid="modais-km"
            className={campo}
          />
        </label>
        <label className="space-y-1">
          <span className={clsx('text-[11px] font-medium uppercase tracking-wider', t.suave)}>Dias por mês</span>
          <input
            inputMode="numeric"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            aria-invalid={diasNumero === null}
            data-testid="modais-dias"
            className={campo}
          />
        </label>
        <label className="space-y-1">
          <span className={clsx('text-[11px] font-medium uppercase tracking-wider', t.suave)}>Pessoas no carro</span>
          <select
            value={pessoas}
            onChange={(e) => setPessoas(Number(e.target.value))}
            data-testid="modais-pessoas"
            className={campo}
          >
            {Array.from({ length: MAX_PESSOAS_NO_CARRO }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} className={t.opcao}>
                {n === 1 ? 'Só eu' : `${n} pessoas`}
              </option>
            ))}
          </select>
        </label>
        <label className={clsx('flex items-end gap-2 pb-2.5 text-sm cursor-pointer', t.checkbox)}>
          <input
            type="checkbox"
            checked={idaEVolta}
            onChange={(e) => setIdaEVolta(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          Ida e volta
        </label>
      </div>

      {!valido ? (
        <p className={clsx('text-xs', t.aviso)} data-testid="modais-erro">
          Informe a distância (até {KM_MAXIMO} km) e os dias por mês (1 a {DIAS_MAXIMO}).
        </p>
      ) : (
        <div className="space-y-2" data-testid="modais-lista">
          {linhas.map((l, i) => (
            <div key={l.id} data-testid={`modal-${l.id}`} className={clsx('p-2.5 rounded-xl transition-colors', t.linha)}>
              <div className="flex items-center justify-between gap-3">
                <p className={clsx('text-sm flex items-center gap-2', t.texto)}>
                  <span className="text-base">{l.emoji}</span>
                  {l.nome}
                  {i === 0 && l.kgMes === 0 && <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full', t.selo)}>zero emissão</span>}
                </p>
                <div className="text-right">
                  <p className={clsx('text-sm font-bold', t.titulo)}>{kg(l.kgMes)}<span className={clsx('text-xs font-medium', t.suave)}> /mês</span></p>
                  {l.id !== 'carro' && (
                    <p className={clsx('text-[11px] font-bold', l.percentualVsCarro >= 0 ? t.bom : t.aviso)}>
                      {l.percentualVsCarro >= 0
                        ? `${l.percentualVsCarro}% a menos que o carro`
                        : `${Math.abs(l.percentualVsCarro)}% a mais que o carro`}
                    </p>
                  )}
                </div>
              </div>
              <div className={clsx('h-1.5 rounded-full mt-2 overflow-hidden', t.trilho)} aria-hidden="true">
                <div
                  className={clsx('h-full rounded-full', t.barra)}
                  style={{ width: maior > 0 ? `${Math.max(2, (l.kgMes / maior) * 100)}%` : '0%', opacity: l.id === 'carro' ? 1 : 0.8 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={clsx('text-[11px] leading-relaxed', t.suave)}>
        Fonte: {FONTE_MODAIS.citacao}. São médias de grandes cidades brasileiras ({FONTE_MODAIS.ano}); o metrô usa a matriz elétrica de 2008.
        Os fatores incluem a produção do combustível, então estes números servem para comparar os meios entre si e não somam à sua pegada de carbono acima.
        Bicicleta e a pé: sem emissão direta (fabricação e alimentação não entram na conta).
      </p>
    </div>
  );
}
