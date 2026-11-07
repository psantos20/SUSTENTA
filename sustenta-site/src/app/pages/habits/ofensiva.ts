/**
 * Ofensiva (sequência de dias seguidos com pelo menos um hábito marcado).
 *
 * Tudo aqui é função pura e usa a data LOCAL do usuário (não UTC): às 22h no
 * Brasil, `toISOString()` já devolve o dia seguinte e quebrava a sequência.
 */

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(d: Date = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Soma (ou subtrai, se negativo) dias a uma data AAAA-MM-DD, sem sofrer com horário de verão. */
export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number);
  return dataLocal(new Date(a, m - 1, d + dias, 12));
}

/** Marcos de sequência e o bônus único de XP ao alcançá-los. */
export const MARCOS_OFENSIVA = [
  { dias: 3, xp: 30 },
  { dias: 7, xp: 70 },
  { dias: 14, xp: 150 },
  { dias: 30, xp: 300 },
  { dias: 60, xp: 500 },
] as const;

/**
 * Sequência que vale HOJE. A guardada no banco só muda quando o usuário marca
 * um hábito; se ele passou um dia inteiro sem marcar, a sequência acabou.
 */
export function ofensivaAtual(streak: number, ultimoRegistro: string, hoje: string): number {
  if (!ultimoRegistro || !Number.isFinite(streak) || streak <= 0) return 0;
  if (ultimoRegistro >= hoje) return streak; // marcou hoje (ou relógio adiantado)
  return ultimoRegistro === somarDias(hoje, -1) ? streak : 0;
}

/** Marcou ontem, mas ainda não hoje: a sequência está por um fio. */
export function ofensivaEmRisco(streak: number, ultimoRegistro: string, hoje: string): boolean {
  return streak > 0 && ultimoRegistro !== '' && ultimoRegistro < hoje && ofensivaAtual(streak, ultimoRegistro, hoje) > 0;
}

/** Sequência depois de marcar um hábito hoje. */
export function ofensivaAposMarcar(streak: number, ultimoRegistro: string, hoje: string): number {
  if (ultimoRegistro >= hoje && streak > 0) return streak; // já tinha marcado hoje
  return ofensivaAtual(streak, ultimoRegistro, hoje) + 1;
}

/** Marcos cruzados ao ir de `anterior` para `nova` (cada marco paga uma vez por vez que é alcançado). */
export function marcosAlcancados(anterior: number, nova: number) {
  return MARCOS_OFENSIVA.filter((m) => anterior < m.dias && nova >= m.dias);
}

export function bonusDosMarcos(anterior: number, nova: number): number {
  return marcosAlcancados(anterior, nova).reduce((s, m) => s + m.xp, 0);
}

/** Próximo marco a perseguir (null depois do último). */
export function proximoMarco(streak: number) {
  return MARCOS_OFENSIVA.find((m) => m.dias > streak) ?? null;
}
