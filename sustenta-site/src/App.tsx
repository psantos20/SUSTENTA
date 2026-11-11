import React from 'react';
import { LoginPage } from './app/pages/LoginPage';
import { AppLayout } from './app/components/layout/AppLayout';
import { NotificacoesProvider } from './app/contexts/NotificacoesPage';
import { ThemeProvider } from './app/contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { buscarTodosRegistros, calcularNivel } from './services/consumo';
import { buscarConvite, entrarNoGrupo, normalizarCodigo } from './services/familia';
import { useFeedback } from './app/contexts/FeedbackContext';

// Telas carregadas sob demanda: cada uma vira um arquivo separado, baixado só
// quando a pessoa abre a tela (o primeiro carregamento fica bem menor).
const DashboardPage = React.lazy(() => import('./app/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ConsumptionPage = React.lazy(() => import('./app/pages/ConsumptionPage').then((m) => ({ default: m.ConsumptionPage })));
const SubscriptionsPage = React.lazy(() => import('./app/pages/SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })));
const ProfilePage = React.lazy(() => import('./app/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AnalysisPage = React.lazy(() => import('./app/pages/AnalysisPage').then((m) => ({ default: m.AnalysisPage })));
const HabitsPage = React.lazy(() => import('./app/pages/Habitspage').then((m) => ({ default: m.HabitsPage })));
const HistoryPage = React.lazy(() => import('./app/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const MapPage = React.lazy(() => import('./app/pages/MapPage').then((m) => ({ default: m.MapPage })));
const ReportsPage = React.lazy(() => import('./app/pages/Reportspage'));
const EducationPage = React.lazy(() => import('./app/pages/EducationPage'));
const SobreNosPage = React.lazy(() => import('./app/pages/SobreNosPage').then((m) => ({ default: m.SobreNosPage })));
const PrivacidadePage = React.lazy(() => import('./app/pages/PrivacidadePage').then((m) => ({ default: m.PrivacidadePage })));
const TermosUsoPage = React.lazy(() => import('./app/pages/TermosUsoPage').then((m) => ({ default: m.TermosUsoPage })));

function Carregando() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
      <p className="text-slate-500 dark:text-slate-300">Carregando...</p>
    </div>
  );
}

// 🔥 Firebase
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./services/firebase";

import {
  type Page, type PagePublica, TITULOS_APP,
  caminhoDaPagina, caminhoPublico, paginaDoCaminho, publicaDoCaminho,
} from './services/rotas';

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (p: string) => void }) {
  if (page === 'dashboard')   return <DashboardPage onNavigate={onNavigate} />;
  if (page === 'consumption') return <ConsumptionPage />;
  if (page === 'subscriptions') return <SubscriptionsPage />;
  if (page === 'profile')     return <ProfilePage />;
  if (page === 'analysis')    return <AnalysisPage />;
  if (page === 'habits')      return <HabitsPage />;
  if (page === 'history')     return <HistoryPage />;
  if (page === 'map')         return <MapPage />;
  if (page === 'reports')     return <ReportsPage />;
  if (page === 'education')   return <EducationPage />;

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Em construção</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          A página <strong>{page}</strong> será criada em breve!
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { avisar, confirmar } = useFeedback();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // A tela atual vem do endereço (URL): F5, botão "voltar" e links diretos funcionam.
  const [currentPage, setCurrentPageState] = React.useState<Page>(
    () => paginaDoCaminho(window.location.pathname) ?? 'dashboard'
  );
  const [publicPage, setPublicPageState] = React.useState<PagePublica>(
    () => publicaDoCaminho(window.location.pathname)
  );

  const setCurrentPage = React.useCallback((page: Page) => {
    setCurrentPageState(page);
    const caminho = caminhoDaPagina(page);
    if (window.location.pathname !== caminho) window.history.pushState({}, '', caminho);
  }, []);

  const setPublicPage = React.useCallback((page: PagePublica) => {
    setPublicPageState(page);
    const caminho = caminhoPublico(page);
    if (window.location.pathname !== caminho) window.history.pushState({}, '', caminho);
  }, []);

  // Botão "voltar"/"avançar" do navegador.
  React.useEffect(() => {
    const aoNavegar = () => {
      setCurrentPageState(paginaDoCaminho(window.location.pathname) ?? 'dashboard');
      setPublicPageState(publicaDoCaminho(window.location.pathname));
    };
    window.addEventListener('popstate', aoNavegar);
    return () => window.removeEventListener('popstate', aoNavegar);
  }, []);

  // Mantém o endereço e o título da aba coerentes com a tela atual.
  React.useEffect(() => {
    if (isAuthenticated) {
      const caminho = caminhoDaPagina(currentPage);
      if (window.location.pathname !== caminho) window.history.replaceState({}, '', caminho);
      document.title = `${TITULOS_APP[currentPage]} | SUSTENTA`;
    } else {
      document.title = 'SUSTENTA';
    }
  }, [isAuthenticated, currentPage]);

  const [nivelInfo, setNivelInfo] = React.useState({
    nivel: 1, xpAtual: 0, xpTotal: 1000, nome: 'Iniciante'
  });

  // Convite via URL (?convite=CODIGO): lido uma vez e removido da barra de endereço.
  const [convitePendente] = React.useState<string | null>(() => {
    const codigo = new URLSearchParams(window.location.search).get('convite');
    if (!codigo) return null;
    window.history.replaceState({}, '', window.location.pathname);
    return normalizarCodigo(codigo);
  });
  const conviteProcessado = React.useRef(false);

  // ESCUTA LOGIN DO FIREBASE
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated || !convitePendente || conviteProcessado.current) return;
    conviteProcessado.current = true;

    // Nunca entra em um grupo automaticamente: um link malicioso poderia
    // colocar a pessoa num grupo que enxerga os dados dela. Pede confirmação.
    const codigo = convitePendente;

    buscarConvite(codigo)
      .then(async (convite) => {
        if (!convite) {
          avisar('Este convite é inválido ou expirou.', 'erro');
          return;
        }
        const aceitar = await confirmar({
          titulo: 'Convite para grupo familiar',
          mensagem:
            `Você foi convidado para o grupo familiar "${convite.nomeGrupo}".\n\n` +
            'Membros do grupo poderão ver seu nome, nível e os dados que você escolher compartilhar. Deseja entrar?',
          textoConfirmar: 'Entrar no grupo',
          textoCancelar: 'Agora não',
        });
        if (!aceitar) return;
        await entrarNoGrupo(codigo);
        setCurrentPage('profile');
      })
      .catch((e) => avisar(e?.message || 'Não foi possível entrar no grupo.', 'erro'));
  }, [isAuthenticated, convitePendente, avisar, confirmar]);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    buscarTodosRegistros().then(registros => {
      const info = calcularNivel(registros.length);
      setNivelInfo({
        nivel: info.nivel,
        xpAtual: info.xpAtual,
        xpTotal: info.xpTotal,
        nome: info.nome
      });
    });
  }, [isAuthenticated, currentPage]);

  // 🔒 LOADING GLOBAL
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-600 dark:text-slate-300">Carregando...</p>
      </div>
    );
  }

  // 🌐 PÁGINAS PÚBLICAS
  if (!isAuthenticated) {
    const voltarLogin = () => setPublicPage('login');

    if (publicPage === 'sobre')
      return <ThemeProvider><React.Suspense fallback={<Carregando />}><SobreNosPage onVoltar={voltarLogin} /></React.Suspense></ThemeProvider>;

    if (publicPage === 'privacidade')
      return <ThemeProvider><React.Suspense fallback={<Carregando />}><PrivacidadePage onVoltar={voltarLogin} /></React.Suspense></ThemeProvider>;

    if (publicPage === 'termos')
      return <ThemeProvider><React.Suspense fallback={<Carregando />}><TermosUsoPage onVoltar={voltarLogin} /></React.Suspense></ThemeProvider>;

    return (
      <ThemeProvider>
        <LoginPage
          onLogin={() => {}} // 🔥 Firebase já controla
          onNavigate={(p) => setPublicPage(p as PagePublica)}
        />
      </ThemeProvider>
    );
  }

  // 🔐 APP LOGADO
  return (
    <ThemeProvider>
      <NotificacoesProvider>
        <div className="dark-transition">
          <AppLayout
            activePage={currentPage}
            onNavigate={(page) => setCurrentPage(page as Page)}
            onLogout={async () => {
              await signOut(auth);
              setCurrentPageState('dashboard');
              setPublicPage('login');
            }}
            nivel={nivelInfo.nivel}
            xpAtual={nivelInfo.xpAtual}
            xpTotal={nivelInfo.xpTotal}
            nomeNivel={nivelInfo.nome}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <React.Suspense fallback={<Carregando />}>
                  <PageContent
                    page={currentPage}
                    onNavigate={(p) => setCurrentPage(p as Page)}
                  />
                </React.Suspense>
              </motion.div>
            </AnimatePresence>
          </AppLayout>
        </div>
      </NotificacoesProvider>
    </ThemeProvider>
  );
}