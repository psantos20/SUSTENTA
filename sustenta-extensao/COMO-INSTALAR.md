# Extensão SUSTENTA Streaming

Mede só o tempo com vídeo ou música tocando na Netflix, Disney+, HBO Max, Prime Video,
YouTube, Spotify e Deezer e envia ao SUSTENTA o total de minutos por dia. Não lê títulos,
endereços nem histórico.

## Instalar (modo desenvolvedor)

1. Abra `chrome://extensions` (no Edge: `edge://extensions`).
2. Ligue o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha esta pasta (`sustenta-extensao`).
4. Fixe a extensão na barra (ícone de quebra-cabeça → alfinete).

## Vincular à sua conta

1. No SUSTENTA, vá em **Assinaturas → Conectar fontes → Gerar código**.
2. Clique no ícone da extensão, digite o código de 6 dígitos e clique em **Vincular**.
3. O código vale 10 minutos e uma única vez.

## Endereço do SUSTENTA

O arquivo `config.js` diz para onde a extensão envia os minutos:

- desenvolvimento (`npm run dev`): `http://localhost:5173` (padrão);
- produção: troque pelo endereço do site no Netlify. Se for um domínio próprio
  (fora de `*.netlify.app`), adicione também em `host_permissions` no `manifest.json`.

Depois de mudar qualquer arquivo, clique em **Recarregar** (↻) no card da extensão em
`chrome://extensions`.

## Como mede

A cada 15 segundos, verifica quanto tempo o player avançou.

- **Vídeo** (Netflix, Disney+, HBO Max, Prime Video, YouTube): conta com a aba visível e o
  vídeo ocupando pelo menos metade da tela. Sem som só conta na página do player ou em tela
  cheia, então trailers mudos da página inicial ficam de fora.
- **Música** (Spotify, Deezer, YouTube Music): conta mesmo com a aba em segundo plano,
  desde que esteja tocando com som.

A cada 5 minutos envia o total de hoje e de ontem.
Na extensão dá para **pausar** a medição ou **desvincular** o navegador a qualquer momento.
