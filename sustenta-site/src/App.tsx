import React from 'react';
import { LoginPage } from './app/pages/LoginPage';
import { AppLayout } from './app/components/layout/AppLayout';
import { DashboardPage } from './app/pages/DashboardPage';
import { ConsumptionPage } from './app/pages/ConsumptionPage';
import { motion, AnimatePresence } from 'motion/react';
import { buscarRegistrosMes, calcularNivel } from './services/consumo';

type Page = 'dashboard' | 'consumption' | 'analysis' | 'habits' | 'history' | 'map' | 'reports' | 'profile' | 'education' | 'settings';

function PageContent({ page, onNavigate }: { page: Page; onNavigate: (p: string) => void }) {
  if (page === 'dashboard') return <DashboardPage onNavigate={onNavigate} />;
  if (page === 'consumption') return <ConsumptionPage />;
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-xl font-bold text-slate-700">Em construção</h2>
        <p className="text-slate-500 mt-2">A página <strong>{page}</strong> será criada em breve!</p>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [nivelInfo, setNivelInfo] = React.useState({ nivel: 1, xpAtual: 0, xpTotal: 1000, nome: 'Iniciante' });

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  React.useEffect(() => {
    if (!isAuthenticated) return;
    buscarRegistrosMes(mesAtual).then(registros => {
      const info = calcularNivel(registros.length);
      setNivelInfo({ nivel: info.nivel, xpAtual: info.xpAtual, xpTotal: info.xpTotal, nome: info.nome });
    });
  }, [isAuthenticated, currentPage]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
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
        <motion.div key={currentPage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <PageContent page={currentPage} onNavigate={setCurrentPage} />
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}