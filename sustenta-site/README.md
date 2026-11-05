# SUSTENTA — Plataforma de Consumo Consciente

Aplicação web para acompanhar gastos de energia, água e outros, entender o impacto ambiental e evoluir com um sistema de XP e níveis, educação ambiental, hábitos e grupos familiares.

**Stack:** React 19 + Vite + TypeScript, Firebase (Authentication + Firestore), Tailwind CSS, Recharts, D3, Google Maps, jsPDF. Funções serverless em `netlify/functions` (notícias e dica de IA).

## Como rodar no seu computador

Pré-requisito: Node.js 22 (ou 20.19+).

```bash
cd sustenta-site
npm install
cp .env.example .env     # no Windows: copie o arquivo e renomeie para .env
npm run dev              # abre em http://localhost:5173
```

### Variáveis do `.env`

O `.env` **nunca vai para o Git** (já está no `.gitignore`). Preencha:

| Variável | Para que serve | Onde conseguir |
|---|---|---|
| `VITE_FIREBASE_*` (6 variáveis) | Login e banco de dados | Firebase Console → Configurações do projeto → Seus apps → Web |
| `VITE_GOOGLE_MAPS_KEY` | Mapa e ecopontos | Google Cloud → APIs e serviços → Credenciais |
| `NEWS_API_KEY` | Aba de notícias | newsapi.org |
| `ANTHROPIC_API_KEY` | Dica personalizada por IA na calculadora de carbono (opcional) | console.anthropic.com |
| `VITE_RECAPTCHA_ENTERPRISE_KEY` | Firebase App Check (opcional) | Console do reCAPTCHA Enterprise |

Tudo que começa com `VITE_` vai para o navegador. As chaves sem esse prefixo (`NEWS_API_KEY`, `ANTHROPIC_API_KEY`) são lidas só pelo servidor do Vite durante o `npm run dev`, por um plugin em `vite.config.ts` que serve as funções de `netlify/functions` em `/.netlify/functions/<nome>`. Por isso as notícias funcionam localmente sem o Netlify CLI.

### Google Maps: o que precisa estar configurado

- O projeto do Google Cloud precisa ter **faturamento ativo** (senão o mapa aparece com "For development purposes only" e o erro `BillingNotEnabledMapError` no console). O uso pequeno costuma caber na cota gratuita; crie um alerta de orçamento.
- APIs ativadas: Maps JavaScript, Places, Directions, Distance Matrix e Geocoding.
- Restrinja a chave por site (`http://localhost:5173/*` e o domínio de produção) e só a essas APIs.

## Testes

```bash
npm test             # lógica pura: validações, nível/XP, rotas e metas (rápido, sem internet)
npm run test:rules   # regras do Firestore (usa o emulador; precisa do firebase-tools e Java)
```

Os testes de `tests/qa.test.ts` foram escritos para o Desafio QA+ (Análise de Valor Limite, Particionamento de Equivalência e Transição de Estados) e cobrem valor do gasto, mês, senha, texto livre, links externos, nível/XP e pontos de hábito.

## Estrutura

```
src/
  app/
    components/   componentes reutilizáveis (layout, dashboard, mapa)
    contexts/     tema, notificações, avisos e confirmações (FeedbackContext)
    pages/        telas do app
  services/       Firebase, regras de negócio e validação
netlify/functions/  news (NewsAPI) e dica-ia (Anthropic)
firestore.rules     regras de segurança do banco
tests/              testes automatizados
```

### Telas e endereços

O app troca de tela pelo endereço, então F5, o botão "voltar" e links diretos funcionam:

`/painel`, `/consumo`, `/analise`, `/habitos`, `/historico`, `/mapa`, `/relatorios`, `/perfil`, `/educacao` (logado) e `/sobre`, `/privacidade`, `/termos` (públicas). As rotas ficam em `src/services/rotas.ts`.

## Funcionalidades

- **Dashboard** com score de sustentabilidade, gráficos, alertas e **metas mensais por categoria** (energia, água e outros), com aviso aos 80% e quando a meta é ultrapassada.
- **Consumo e histórico:** registro, edição e exclusão de gastos, com validação (valor de R$ 0,01 a R$ 1.000.000, no máximo 2 casas decimais).
- **Relatórios** em PDF e CSV, comparação entre meses.
- **Mapa** com ecopontos próximos, rotas e distâncias.
- **Educação:** notícias, quiz, desafios e calculadora de carbono.
- **Hábitos, grupo familiar, perfil** e exportação/exclusão de dados (LGPD).

### Níveis

O nível é calculado com **todos** os registros do usuário (100 XP por registro, 1000 XP por nível) e vai até o nível 10:
Iniciante → Consciente → Engajado → Ativo → Dedicado → Guardião → Protetor → Mestre → Guardião Verde → Eco Herói.

## Deploy

O projeto foi preparado para a **Netlify**: o `netlify.toml` define os cabeçalhos de segurança, o redirecionamento das rotas para `index.html` e as funções serverless. Configure no painel da Netlify as variáveis `NEWS_API_KEY`, `ANTHROPIC_API_KEY` (opcional) e `FIREBASE_PROJECT_ID`. Publicar as regras do banco: `firebase deploy --only firestore:rules` (rode `npm run test:rules` antes).

Em outras plataformas (como a Vercel) as funções de `netlify/functions` precisariam ser adaptadas.

## Segurança

Leia o [SECURITY.md](SECURITY.md): ele define o padrão do projeto (regras do Firestore, chaves só no servidor, LGPD) e traz o checklist para cada funcionalidade nova.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela em branco e erro `auth/invalid-api-key` | Falta o `.env` (ou foi preciso reiniciar o `npm run dev` depois de criá-lo) |
| Aba de notícias não carrega | `NEWS_API_KEY` ausente no `.env`, ou servidor não reiniciado |
| Mapa com marca d'água e erro `BillingNotEnabledMapError` | Faturamento do Google Cloud inativo ou fechado |
| Dica de IA aparece como "indisponível" | `ANTHROPIC_API_KEY` ausente, ou limite de uso atingido |

## Autor

Desenvolvido por Pedro, com foco em tecnologia, experiência do usuário e impacto positivo no meio ambiente.
