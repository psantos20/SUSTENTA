import React from 'react';
import { LoginPage } from './app/pages/LoginPage';
import { AppLayout } from './app/components/layout/AppLayout';
import { DashboardPage } from './app/pages/DashboardPage';
import { ConsumptionPage } from './app/pages/ConsumptionPage';
import { ProfilePage } from './app/pages/ProfilePage';
import { NotificacoesProvider } from './app/contexts/NotificacoesPage';
import { ThemeProvider } from './app/contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { buscarTodosRegistros, calcularNivel } from './services/consumo';
import { AnalysisPage } from './app/pages/AnalysisPage';
type Page =
  | 'dashboard' | 'consumption' | 'analysis' | 'habits'
  | 'history' | 'map' | 'reports' | 'profile'
  | 'education' | 'settings' | 'notifications';

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (p: string) => void }) {
  if (page === 'dashboard')     return <DashboardPage onNavigate={onNavigate} />;
  if (page === 'consumption')   return <ConsumptionPage />;
  if (page === 'profile')       return <ProfilePage />;
  if (page === 'analysis') return <AnalysisPage />;

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
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentPage, setCurrentPage]         = React.useState<Page>('dashboard');
  const [nivelInfo, setNivelInfo]             = React.useState({ nivel: 1, xpAtual: 0, xpTotal: 1000, nome: 'Iniciante' });
  const [convitePendente, setConvitePendente] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('convite');
    if (codigo) {
      setConvitePendente(codigo);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated || !convitePendente) return;
    entrarNoGrupo(convitePendente)
      .then(() => { setConvitePendente(null); setCurrentPage('profile'); })
      .catch(() => setConvitePendente(null));
  }, [isAuthenticated, convitePendente]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    buscarTodosRegistros().then(registros => {
      const info = calcularNivel(registros.length);
      setNivelInfo({ nivel: info.nivel, xpAtual: info.xpAtual, xpTotal: info.xpTotal, nome: info.nome });
    });
  }, [isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={() => setIsAuthenticated(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <NotificacoesProvider>
        <div className="dark-transition">
          <AppLayout
            activePage={currentPage}
            onNavigate={(page) => setCurrentPage(page as Page)}
            onLogout={() => { setIsAuthenticated(false); setCurrentPage('dashboard'); }}
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
                <PageContent page={currentPage} onNavigate={(p) => setCurrentPage(p as Page)} />
              </motion.div>
            </AnimatePresence>
          </AppLayout>
        </div>
      </NotificacoesProvider>
    </ThemeProvider>
  );
}