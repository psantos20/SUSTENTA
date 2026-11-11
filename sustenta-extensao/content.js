/**
 * Roda só nas páginas dos streamings e apps de música. A cada 15 segundos, vê se
 * algo está tocando de verdade e avisa o service worker quantos segundos tocaram.
 * Não lê títulos nem nada da página: só "tocou X segundos" + qual serviço.
 */
(() => {
  const INTERVALO_S = 15;
  /** Abas em segundo plano rodam o timer mais devagar; nunca contamos mais que isso por aviso. */
  const MAXIMO_S = 120;
  const host = location.hostname;
  const servico = host.includes('netflix')
    ? 'netflix'
    : host.includes('disneyplus')
      ? 'disney'
      : host.includes('max.com') || host.includes('hbomax')
        ? 'max'
        : host.includes('primevideo') || host.includes('amazon.')
          ? 'prime'
          : host.includes('youtube')
            ? 'youtube'
            : host.includes('spotify')
              ? 'spotify'
              : host.includes('deezer')
                ? 'deezer'
                : null;
  if (!servico) return;

  /** Música (e o YouTube Music) toca com a aba escondida: aí vale qualquer áudio com som. */
  const musica = servico === 'spotify' || servico === 'deezer' || host.startsWith('music.youtube');

  /** Página do player: aqui o vídeo conta mesmo sem som (legenda, vídeo mudo). */
  function paginaDoPlayer() {
    if (document.fullscreenElement) return true;
    const p = location.pathname;
    if (servico === 'netflix') return p.startsWith('/watch/');
    if (servico === 'disney') return p.startsWith('/play/') || p.includes('/video/');
    if (servico === 'max') return p.startsWith('/video/watch/') || p.startsWith('/play/');
    if (servico === 'youtube') return p === '/watch' || p.startsWith('/live/');
    return false;
  }

  const ultimoTempo = new WeakMap();
  let ultimoAviso = Date.now();

  /**
   * Devolve quantos segundos tocaram desde a última olhada (0 se nada tocou).
   * Vídeo: tocando, na aba visível, ocupando pelo menos metade da largura e com
   * som (sem som só conta na página do player). Isso ignora trailers mudos da
   * página inicial. Música: qualquer áudio ou vídeo tocando com som, mesmo com a
   * aba em segundo plano.
   */
  function segundosTocados(decorrido) {
    const visivel = document.visibilityState === 'visible';
    if (!musica && !visivel) {
      for (const v of document.querySelectorAll('video')) ultimoTempo.set(v, v.currentTime);
      return 0;
    }
    let maior = 0;
    for (const m of document.querySelectorAll(musica ? 'audio, video' : 'video')) {
      const antes = ultimoTempo.get(m);
      ultimoTempo.set(m, m.currentTime);
      if (m.paused || m.ended || m.readyState < 3) continue;
      if (antes === undefined || m.currentTime <= antes) continue;
      if (musica) {
        if (m.muted || m.volume === 0) continue;
      } else {
        if (m.getBoundingClientRect().width < window.innerWidth * 0.5) continue;
        if (m.muted && !paginaDoPlayer()) continue;
      }
      // Tempo do player que avançou, limitado ao tempo real (evita pular no vídeo contar).
      maior = Math.max(maior, Math.min(m.currentTime - antes, decorrido));
    }
    return Math.min(Math.round(maior), MAXIMO_S);
  }

  const timer = setInterval(() => {
    const agora = Date.now();
    const decorrido = (agora - ultimoAviso) / 1000 + 1;
    ultimoAviso = agora;
    const segundos = segundosTocados(decorrido);
    if (segundos <= 0) return;
    try {
      chrome.runtime.sendMessage({ tipo: 'tick', servico, segundos }).catch(() => {});
    } catch {
      // A extensão foi atualizada ou removida: para de medir nesta aba.
      clearInterval(timer);
    }
  }, INTERVALO_S * 1000);
})();
