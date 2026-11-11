/**
 * Regras da extensão do navegador do SUSTENTA Streaming (funções puras, testáveis).
 *
 * Fluxo:
 *  1. No app, a pessoa gera um código de 6 dígitos (vale 10 minutos, uma vez).
 *  2. Na extensão, digita o código; o servidor troca o código por uma chave da
 *     extensão. Guardamos só o hash (SHA-256) da chave, nunca a chave em si.
 *  3. A extensão envia, com essa chave, só os minutos por dia em cada serviço.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';

export const SERVICOS_EXTENSAO = ['netflix', 'disney', 'max', 'prime', 'youtube', 'spotify', 'deezer'];
export const VALIDADE_CODIGO_MS = 10 * 60 * 1000;
/** Quantos dias para trás a extensão pode enviar (ela reenvia ontem e hoje). */
export const DIAS_PARA_TRAS = 7;
export const MINUTOS_POR_DIA_MAX = 1440;

export function gerarCodigo() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function gerarChaveExtensao() {
  return randomBytes(32).toString('base64url');
}

export function hashChave(chave) {
  return createHash('sha256').update(String(chave)).digest('hex');
}

/** "482 913", "482-913" ou "482913" → "482913"; inválido → null. */
export function normalizarCodigo(codigo) {
  if (typeof codigo !== 'string') return null;
  const limpo = codigo.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(limpo) ? limpo : null;
}

/** AAAA-MM-DD em UTC-3 (Brasília), para a data "de hoje" bater com a da pessoa. */
export function diaEmBrasilia(agora = new Date()) {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

function somarDiasIso(dia, n) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Valida o envio da extensão: { dia: 'AAAA-MM-DD', minutos: { netflix: 42, ... } }.
 * Devolve { dia, mes, diaDoMes, minutos } ou lança um Error com mensagem curta.
 */
export function validarEnvio(corpo, agora = new Date()) {
  if (!corpo || typeof corpo !== 'object') throw new Error('Envio inválido.');
  const { dia, minutos } = corpo;
  if (typeof dia !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dia)) {
    throw new Error('Dia inválido.');
  }
  const hoje = diaEmBrasilia(agora);
  // Um dia de folga para frente cobre fuso e relógio adiantado.
  if (dia > somarDiasIso(hoje, 1) || dia < somarDiasIso(hoje, -DIAS_PARA_TRAS)) throw new Error('Dia fora do período aceito.');
  if (!minutos || typeof minutos !== 'object' || Array.isArray(minutos)) throw new Error('Minutos inválidos.');

  const limpos = {};
  for (const [servico, valor] of Object.entries(minutos)) {
    if (!SERVICOS_EXTENSAO.includes(servico)) throw new Error('Serviço inválido.');
    if (!Number.isInteger(valor) || valor < 0 || valor > MINUTOS_POR_DIA_MAX) throw new Error('Minutos inválidos.');
    limpos[servico] = valor;
  }
  if (Object.keys(limpos).length === 0) throw new Error('Nada para enviar.');
  return { dia, mes: dia.slice(0, 7), diaDoMes: dia.slice(8, 10), minutos: limpos };
}
