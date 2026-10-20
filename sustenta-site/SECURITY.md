# Segurança no SUSTENTA: o padrão do projeto

Este documento define como toda funcionalidade, atual ou futura, deve tratar dados. Ele vale também para o Open Finance que está por vir. Se uma funcionalidade nova não segue estas regras, ela não vai para produção.

## 1. Princípios

1. **Negar por padrão.** O Firestore só libera o que tiver uma regra explícita em `firestore.rules`. Coleção nova significa regra nova e teste novo.
2. **Cada um vê só o que é seu.** O dono de um dado é o `request.auth.uid`. Para compartilhar, por exemplo com a família, o dono do dado precisa autorizar.
3. **O servidor valida tudo.** A validação no React (`src/services/validacao.ts`) serve para dar uma boa mensagem ao usuário. Quem garante a segurança são as regras do Firestore e as funções serverless. Os limites devem ser os mesmos nos dois lugares.
4. **Segredos nunca no front-end.** Tudo que começa com `VITE_` vai para o navegador de qualquer pessoa. Chaves de API pagas ou sensíveis (NewsAPI, IA, Open Finance, pagamentos) ficam **só** em `netlify/functions`, configuradas no painel da Netlify.
5. **Guardar o mínimo.** Só salve o que a tela usa. Nada de número de conta ou cartão completo, documentos ou senhas.
6. **LGPD.** O usuário pode baixar os próprios dados (Perfil → Baixar Meus Dados) e excluir a conta com tudo junto (Perfil → Excluir Conta). Coleção nova também precisa entrar em `src/services/conta.ts`.

## 2. Checklist para cada funcionalidade nova

- [ ] As coleções e campos novos têm regra em `firestore.rules`, com dono, tipos, tamanhos e campos permitidos.
- [ ] Os testes em `tests/firestore.rules.test.ts` cobrem quem **pode** e quem **não pode** acessar, e `npm run test:rules` passa.
- [ ] Toda entrada de texto tem `maxLength` no input e passa por `limparTexto()` antes de salvar.
- [ ] Links vindos de fora passam por `urlExternaSegura()`.
- [ ] Não há chave secreta no código do front-end. Integrações pagas usam `chamarFuncaoAutenticada()` (em `src/services/api.ts`).
- [ ] A função serverless usa `protegerHandler`, `verificarUsuario` e `limitarTaxa` (em `netlify/lib/seguranca.js`).
- [ ] Os dados novos entram em `exportarMeusDados()` e `excluirConta()`.
- [ ] Nenhum `console.log` imprime dados pessoais ou tokens.

## 3. Como foi corrigido (outubro de 2026)

| Problema | Risco | Correção |
|---|---|---|
| Não havia `firestore.rules` versionado no projeto | Se o banco estiver em "modo de teste", qualquer pessoa na internet lê e apaga todos os dados | Regras completas, com testes |
| Cache de notícias gravado pelo navegador no Firestore | Qualquer usuário poderia trocar as notícias de todos e inserir links maliciosos | O cache passou para a CDN da função `/news`, sem escrita pelo cliente, e os links são validados |
| Chamada à API de IA direto do navegador | Para funcionar, a chave teria que ficar exposta | Nova função `dica-ia`, que exige login, tem limite de uso e só aceita números como entrada |
| Grupo familiar: busca por código em toda a coleção e escrita no perfil de outros usuários | Daria para enumerar grupos e alterar dados de terceiros | Nova coleção `convites_familia/{codigo}`, entrada validada pelas regras e `membroUids` |
| Entrar em grupo automaticamente por link | Um link malicioso colocaria a vítima num grupo que vê os dados dela | Agora o app pede confirmação |
| "Quem pode ver meus gastos" controlado só pela tela | Bastava chamar a API direto para ver os gastos | A regra do Firestore confere `dadosCompartilhados.gastos` |
| XP e pontos de hábito sem limite | Trapaça no ranking | Limite por escrita nas regras e pontos de hábito limitados entre 5 e 100 |
| Código de convite com `Math.random` | Código previsível | `crypto.getRandomValues`, 10 caracteres |
| Senha mínima de 6 caracteres | Senhas fracas | Mínimo de 8 caracteres, com letras e números |
| "Excluir Conta" sem função | Descumpria a LGPD | Exclusão completa com reautenticação e exportação de dados |
| Função `/news` com CORS `*` e repassando detalhes de erro | Abuso da cota e vazamento de informações | CORS restrito, só GET, chave no cabeçalho e erros genéricos |
| Sem cabeçalhos de segurança | Clickjacking, sniffing | `netlify.toml` com HSTS, `X-Frame-Options` e CSP (em modo report-only) |

## 4. Ações manuais (fora do código)

Estas etapas precisam ser feitas por alguém com acesso aos painéis:

1. **Publicar as regras:** `firebase deploy --only firestore:rules`. Antes, rode `npm run test:rules`.
2. **Grupos antigos:** depois de publicar as regras, cada **dono** de grupo precisa abrir o app uma vez na aba Família. Isso migra o grupo automaticamente. Até lá, os demais membros não conseguem ver o grupo.
3. **Google Maps:** no Google Cloud Console, restrinja `VITE_GOOGLE_MAPS_KEY` por *HTTP referrer* (domínio do site e `localhost`) e só às APIs usadas (Maps JavaScript e Places).
4. **Firebase Authentication:**
   - em Configurações, ative a *proteção contra enumeração de e-mail*;
   - defina a *política de senha* (mínimo de 8 caracteres);
   - deixe em *Domínios autorizados* apenas o domínio real e `localhost`.
5. **App Check (recomendado):** crie uma chave reCAPTCHA Enterprise, coloque-a em `VITE_RECAPTCHA_ENTERPRISE_KEY` e, depois de testar, ative o *enforcement* do Firestore no console.
6. **Netlify, variáveis de ambiente:** `NEWS_API_KEY`, `ANTHROPIC_API_KEY` (se for usar a dica de IA) e `FIREBASE_PROJECT_ID`.
7. **CSP:** navegue por todas as páginas em produção. Se o console não mostrar avisos de CSP, troque `Content-Security-Policy-Report-Only` por `Content-Security-Policy` no `netlify.toml`.
8. **Histórico do Git:** rode `git log --all -- sustenta-site/.env`. Se o `.env` já foi commitado alguma vez, gere chaves novas para Maps e NewsAPI.

## 5. Para o Open Finance (próximo passo)

Siga o mesmo padrão:

- o token do agregador fica só na função serverless;
- o webhook valida a assinatura;
- as transações são gravadas pelo servidor (Admin SDK) e os clientes não têm permissão de escrita nessa coleção;
- as permissões pedidas ao agregador são só de leitura;
- o botão "desconectar" revoga a conexão e apaga os dados.
