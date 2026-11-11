const NOMES = {
  netflix: 'Netflix',
  disney: 'Disney+',
  max: 'HBO Max',
  prime: 'Prime Video',
  youtube: 'YouTube',
  spotify: 'Spotify',
  deezer: 'Deezer',
};
const $ = (id) => document.getElementById(id);

function horas(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')} min` : ''}` : `${m} min`;
}

function mostrarMensagem(texto, ok = false) {
  const el = $('mensagem');
  el.hidden = !texto;
  el.textContent = texto || '';
  el.classList.toggle('ok', ok);
}

function render(s) {
  if (!s) return;
  $('selo').textContent = s.vinculada ? (s.pausado ? 'Pausada' : 'Vinculada') : 'Não vinculada';
  $('selo').classList.toggle('ok', s.vinculada && !s.pausado);
  $('vincular').hidden = s.vinculada;
  $('vinculada').hidden = !s.vinculada;
  if (!s.vinculada) {
    if (s.erro) mostrarMensagem(s.erro);
    return;
  }
  const agora = $('agora');
  agora.classList.toggle('ativo', !!s.medindo);
  agora.textContent = s.pausado ? 'Medição pausada' : s.medindo ? `Medindo agora: ${NOMES[s.medindo]}` : 'Nada tocando agora';
  $('lista').replaceChildren(
    ...Object.entries(NOMES).map(([id, nome]) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = nome;
      const b = document.createElement('b');
      b.textContent = horas(s.minutosHoje[id]);
      li.append(span, b);
      return li;
    }),
  );
  $('btn-pausar').textContent = s.pausado ? 'Retomar medição' : 'Pausar medição';
  $('btn-pausar').dataset.pausado = String(s.pausado);
  $('envio').textContent = s.ultimoEnvio
    ? `Último envio às ${new Date(s.ultimoEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda não enviou nada hoje.';
  mostrarMensagem(s.erro);
}

const pedir = (msg) => chrome.runtime.sendMessage(msg);

$('form-codigo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = $('codigo').value.replace(/\D/g, '');
  if (codigo.length !== 6) return mostrarMensagem('O código tem 6 dígitos.');
  $('btn-vincular').disabled = true;
  const r = await pedir({ tipo: 'vincular', codigo });
  $('btn-vincular').disabled = false;
  if (!r?.ok) return mostrarMensagem(r?.mensagem || 'Não foi possível vincular.');
  render(await pedir({ tipo: 'status' }));
  mostrarMensagem('Pronto! Este navegador está vinculado ao SUSTENTA.', true);
});

$('btn-pausar').addEventListener('click', async () => {
  render(await pedir({ tipo: 'pausar', pausado: $('btn-pausar').dataset.pausado !== 'true' }));
});

$('btn-enviar').addEventListener('click', async () => {
  $('btn-enviar').disabled = true;
  const r = await pedir({ tipo: 'enviar' });
  $('btn-enviar').disabled = false;
  render(await pedir({ tipo: 'status' }));
  if (r?.ok) mostrarMensagem('Minutos enviados.', true);
});

$('btn-desvincular').addEventListener('click', async () => {
  render(await pedir({ tipo: 'desvincular' }));
  mostrarMensagem('Este navegador foi desvinculado. Para parar de vez, remova a extensão.', true);
});

pedir({ tipo: 'status' }).then(render);
setInterval(() => pedir({ tipo: 'status' }).then(render), 5000);
