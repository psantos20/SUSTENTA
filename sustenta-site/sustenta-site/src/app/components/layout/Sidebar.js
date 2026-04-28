"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var clsx_1 = require("clsx");
var tailwind_merge_1 = require("tailwind-merge");
var NotificacoesPage_1 = require("../../contexts/NotificacoesPage");
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
var Sidebar = function (_a) {
    var activePage = _a.activePage, onNavigate = _a.onNavigate, onLogout = _a.onLogout, _b = _a.nivel, nivel = _b === void 0 ? 1 : _b, _c = _a.xpAtual, xpAtual = _c === void 0 ? 0 : _c, _d = _a.xpTotal, xpTotal = _d === void 0 ? 1000 : _d, _e = _a.nomeNivel, nomeNivel = _e === void 0 ? 'Iniciante' : _e, _f = _a.mobile, mobile = _f === void 0 ? false : _f;
    var naoLidas = (0, NotificacoesPage_1.useNotificacoes)().naoLidas;
    var menuGroups = [
        {
            title: 'Principal',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: lucide_react_1.LayoutDashboard },
                { id: 'consumption', label: 'Registrar Consumo', icon: lucide_react_1.Receipt },
                { id: 'analysis', label: 'Análises & Insights', icon: lucide_react_1.BarChart3 },
            ],
        },
        {
            title: 'Ação e Progresso',
            items: [
                { id: 'habits', label: 'Hábitos e Desafios', icon: lucide_react_1.CheckSquare },
                { id: 'history', label: 'Histórico Inteligente', icon: lucide_react_1.History },
                { id: 'map', label: 'Mapa Sustentável', icon: lucide_react_1.MapPin },
            ],
        },
        {
            title: 'Sistema',
            items: [
                { id: 'reports', label: 'Relatórios', icon: lucide_react_1.FileText },
                { id: 'profile', label: 'Perfil e Família', icon: lucide_react_1.User },
                { id: 'education', label: 'Educação Ambiental', icon: lucide_react_1.BookOpen },
            ],
        },
    ];
    var wrapperClass = mobile
        ? 'flex flex-col flex-1 overflow-y-auto'
        : 'fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-50 transition-colors duration-300';
    return (<aside className={wrapperClass}>
      {/* Logo — só no desktop */}
      {!mobile && (<div className="p-6 flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
            <lucide_react_1.Leaf className="text-white w-6 h-6"/>
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Sustenta</span>
        </div>)}

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto">
        {menuGroups.map(function (group, idx) { return (<div key={idx} className="space-y-2">
            <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map(function (item) {
                var Icon = item.icon;
                var isActive = activePage === item.id;
                return (<button key={item.id} onClick={function () { return onNavigate(item.id); }} className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group', isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-emerald-600 dark:hover:text-emerald-400')}>
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-5 h-5 transition-colors', isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-500')}/>
                      {item.label}
                    </div>
                    {isActive && <lucide_react_1.ChevronRight className="w-4 h-4"/>}
                  </button>);
            })}
            </div>
          </div>); })}
      </nav>

      {/* Rodapé XP + logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4 rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg">
              <lucide_react_1.Trophy className="w-4 h-4 text-emerald-600"/>
            </div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
              Nível {nivel}: {nomeNivel}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: "".concat(Math.round((xpAtual / xpTotal) * 100), "%") }}/>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-2 font-medium">
            {xpAtual}/{xpTotal} XP para Nível {nivel + 1}
          </p>
        </div>

        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
          <lucide_react_1.LogOut className="w-5 h-5"/>
          Sair da Conta
        </button>
      </div>
    </aside>);
};
exports.Sidebar = Sidebar;
