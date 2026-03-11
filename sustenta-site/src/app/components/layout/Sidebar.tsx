import React from 'react';
import { 
  LayoutDashboard, Receipt, BarChart3, CheckSquare,
  MapPin, FileText, User, Settings, Leaf, ChevronRight,
  LogOut, BookOpen, Trophy, History as HistoryIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  nivel?: number;
  xpAtual?: number;
  xpTotal?: number;
  nomeNivel?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout, nivel = 1, xpAtual = 0, xpTotal = 1000, nomeNivel = 'Iniciante' }) => {
  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'consumption', label: 'Registrar Consumo', icon: Receipt },
        { id: 'analysis', label: 'Análises & Insights', icon: BarChart3 },
      ]
    },
    {
      title: 'Ação e Progresso',
      items: [
        { id: 'habits', label: 'Hábitos e Desafios', icon: CheckSquare },
        { id: 'history', label: 'Histórico Inteligente', icon: HistoryIcon },
        { id: 'map', label: 'Mapa Sustentável', icon: MapPin },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'reports', label: 'Relatórios', icon: FileText },
        { id: 'profile', label: 'Perfil e Família', icon: User },
        { id: 'education', label: 'Educação Ambiental', icon: BookOpen },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
          <Leaf className="text-white w-6 h-6" />
        </div>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">Sustenta</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-emerald-50 text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-emerald-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-emerald-500")} />
                      {item.label}
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-emerald-50 p-4 rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white p-1.5 rounded-lg">
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-800">Nível {nivel}: {nomeNivel}</span>
          </div>
          <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(xpAtual / xpTotal) * 100}%` }} />
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-medium">{xpAtual}/{xpTotal} XP para Nível {nivel + 1}</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>
      </div>
    </aside>
  );
};