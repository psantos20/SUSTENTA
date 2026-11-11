/**
 * Service worker da extensão SUSTENTA Streaming.
 *  - Soma os segundos assistidos por dia e por serviço (só na memória do navegador).
 *  - A cada 5 minutos, envia ao SUSTENTA o total em minutos de hoje e de ontem.
 *  - Guarda a chave da extensão recebida na vinculação (nunca a senha da pessoa).
 */
import { ENDERECO_SUSTENTA } from './config.js';

const URL_FUNCAO = `${ENDERECO_SUSTENTA}/.netlify/functions/streaming-extensao`;
const SERVICOS = ['netflix', 'disney', 'max', 'prime', 'youtube', 'spotify', 'deezer'];
const DIAS_GUARDADOS = 8;
const ALARME = 'enviar-minutos';

/** AAAA-MM-DD no horário local do computador. */
function diaLocal(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

function ontem() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return diaLocal(d);
}

async function ler() {
  const d = await chrome.storage.local.get(['chave', 'uso', 'pausado', 'agora', 'ultimoEnvio', 'erro']);
  return { chave: d.chave ?? null, uso: d.uso ?? {}, pausado: !!d.pausado, agora: d.agora ?? null, ultimoEnvio: d.ultimoEnvio ?? null, erro: d.erro ?? null };
}

async function chamar(corpo, chave) {
  const res = await fetch(URL_FUNCAO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(chave ? { Authorization: `Bearer ${chave}` } : {}) },
    body: JSON.stringify(corpo),
  });
  const dados = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, dados };
}

async function registrarTick(servico, segundos) {
  if (!SERVICOS.includes(servico) || !Number.isFinite(segundos) || segundos <= 0 || segundos > 120) return;
  const { uso, pausado } = await ler();
  if (pausado) return;
  const dia = diaLocal();
  uso[dia] = uso[dia] ?? {};
  uso[dia][servico] = (uso[dia][servico] ?? 0) + segundos;
  // Só os últimos dias ficam guardados.
  for (const d of Object.keys(uso).sort().slice(0, -DIAS_GUARDADOS)) delete uso[d];
  await chrome.storage.local.set({ uso, agora: { servico, em: Date.now() } });
}

async function enviar() {
  const { chave, uso } = await ler();
  if (!chave) return { ok: false, motivo: 'nao_vinculada' };
  for (const dia of [ontem(), diaLocal()]) {
    const segundos = uso[dia];
    if (!segundos) continue;
    const minutos = {};
    for (const s of SERVICOS) if (segundos[s]) minutos[s] = Math.min(1440, Math.round(segundos[s] / 60));
    if (Object.keys(minutos).length === 0) continue;
    try {
      const r = await chamar({ acao: 'enviar', dia, minutos }, chave);
      if (r.status === 401) {
        await chrome.storage.local.remove('chave');
        await chrome.storage.local.set({ erro: 'Extensão desvinculada no SUSTENTA. Gere um novo código.' });
        return { ok: false, motivo: 'desvinculada' };
      }
      if (!r.ok) {
        await chrome.storage.local.set({ erro: r.dados?.message || 'Não foi possível enviar agora.' });
        return { ok: false, motivo: 'erro' };
      }
    } catch {
      await chrome.storage.local.set({ erro: 'Sem conexão com o SUSTENTA. Tentaremos de novo em 5 minutos.' });
      return { ok: false, motivo: 'rede' };
    }
  }
  await chrome.storage.local.set({ ultimoEnvio: Date.now(), erro: null });
  return { ok: true };
}

async function vincular(codigo) {
  try {
    const r = await chamar({ acao: 'vincular', codigo });
    if (!r.ok || typeof r.dados?.chave !== 'string') return { ok: false, mensagem: r.dados?.message || 'Não foi possível vincular.' };
    await chrome.storage.local.set({ chave: r.dados.chave, erro: null });
    await enviar();
    return { ok: true };
  } catch {
    return { ok: false, mensagem: 'Sem conexão com o SUSTENTA. Confira se o site está aberto.' };
  }
}

async function status() {
  const { chave, uso, pausado, agora, ultimoEnvio, erro } = await ler();
  const hoje = uso[diaLocal()] ?? {};
  const minutosHoje = Object.fromEntries(SERVICOS.map((s) => [s, Math.round((hoje[s] ?? 0) / 60)]));
  const medindo = agora && Date.now() - agora.em < 90_000 && !pausado ? agora.servico : null;
  return { vinculada: !!chave, pausado, minutosHoje, medindo, ultimoEnvio, erro };
}

function garantirAlarme() {
  chrome.alarms.get(ALARME).then((a) => {
    if (!a) chrome.alarms.create(ALARME, { periodInMinutes: 5 });
  });
}

chrome.runtime.onInstalled.addListener(garantirAlarme);
chrome.runtime.onStartup.addListener(garantirAlarme);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARME) enviar();
});

chrome.runtime.onMessage.addListener((msg, remetente, responder) => {
  // Ticks só vêm dos scripts de conteúdo; o resto só das páginas da própria extensão (popup).
  const paginaDaExtensao = remetente.id === chrome.runtime.id && String(remetente.url ?? '').startsWith(`chrome-extension://${chrome.runtime.id}/`);
  const doPopup = paginaDaExtensao;
  (async () => {
    if (msg?.tipo === 'tick' && remetente.tab && !paginaDaExtensao) return registrarTick(msg.servico, msg.segundos);
    if (!doPopup) return null;
    if (msg?.tipo === 'status') return status();
    if (msg?.tipo === 'vincular') return vincular(String(msg.codigo ?? ''));
    if (msg?.tipo === 'enviar') return enviar();
    if (msg?.tipo === 'pausar') {
      await chrome.storage.local.set({ pausado: !!msg.pausado });
      return status();
    }
    if (msg?.tipo === 'desvincular') {
      await chrome.storage.local.remove(['chave', 'erro']);
      return status();
    }
    return null;
  })().then(responder);
  return true;
});
