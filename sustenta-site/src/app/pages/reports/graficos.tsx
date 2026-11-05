export function DonutChart({
  energia,
  agua,
  outro,
  total,
}: {
  energia: number;
  agua: number;
  outro: number;
  total: number;
}) {
  const cx = 64;
  const cy = 64;
  const r = 48;
  const sw = 18;
  const circum = 2 * Math.PI * r;

  const slices = [
    { valor: energia, color: '#eab308', label: 'Energia' },
    { valor: agua, color: '#3b82f6', label: 'Água' },
    { valor: outro, color: '#8b5cf6', label: 'Outros' },
  ];

  let offset = 0;

  const arcs = slices.map((s) => {
    const pct = total > 0 ? s.valor / total : 0;
    const dash = pct * circum;
    const arc = { ...s, dash, offset, pct };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />

        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={sw}
            strokeDasharray={`${a.dash} ${circum - a.dash}`}
            strokeDashoffset={circum / 4 - a.offset}
            strokeLinecap="butt"
          />
        ))}

        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="10" opacity="0.6">
          Total
        </text>

        <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
          R${total.toFixed(0)}
        </text>
      </svg>

      <div className="space-y-2">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: a.color }}
            />
            <span className="text-xs text-slate-300">{a.label}</span>
            <span className="text-xs text-white font-semibold ml-auto pl-3">
              {total > 0 ? `${(a.pct * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


export function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const r = 52;
  const cx = 64;
  const cy = 64;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg - 90));
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg - 90));

  const describeArc = (sa: number, ea: number) => {
    const large = ea - sa > 180 ? 1 : 0;
    return `M ${arcX(sa)} ${arcY(sa)} A ${r} ${r} 0 ${large} 1 ${arcX(ea)} ${arcY(ea)}`;
  };

  const filled = (score / 100) * 180 - 90;
  const angle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="72" viewBox="0 0 128 80">
        <path
          d={describeArc(-90, 90)}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
          strokeLinecap="round"
        />

        <path
          d={describeArc(-90, filled)}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />

        <line
          x1={cx}
          y1={cy}
          x2={cx + (r - 6) * Math.cos(toRad(angle - 90))}
          y2={cy + (r - 6) * Math.sin(toRad(angle - 90))}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle cx={cx} cy={cy} r="4" fill="white" />

        <text x={cx} y={cy + 20} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
          {score}
        </text>
      </svg>

      <span className="text-xs text-slate-400">Score de Sustentabilidade</span>
    </div>
  );
}

export function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium mb-1">{label}</p>

      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">
            {p.dataKey === 'score' ? p.value : `R$ ${Number(p.value).toFixed(2)}`}
          </span>
        </div>
      ))}
    </div>
  );
}
