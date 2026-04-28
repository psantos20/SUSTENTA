"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLayout = void 0;
var react_1 = require("react");
var Sidebar_1 = require("./Sidebar");
var lucide_react_1 = require("lucide-react");
var react_2 = require("motion/react");
var firebase_1 = require("../../../services/firebase");
var firestore_1 = require("firebase/firestore");
var NotificacoesPage_1 = require("../../contexts/NotificacoesPage");
// --- Icone por tipo de notificacao ---
var ICONE_TIPO = {
    alerta_gasto: lucide_react_1.AlertCircle,
    conquista: lucide_react_1.Trophy,
    lembrete: lucide_react_1.Calendar,
    familia: lucide_react_1.Users,
};
var COR_TIPO = {
    alerta_gasto: 'text-amber-500',
    conquista: 'text-emerald-500',
    lembrete: 'text-blue-500',
    familia: 'text-purple-500',
};
function formatarTempo(data) {
    var diff = Date.now() - data.getTime();
    var min = Math.floor(diff / 60000);
    var h = Math.floor(diff / 3600000);
    var d = Math.floor(diff / 86400000);
    if (min < 1)
        return 'agora';
    if (min < 60)
        return "".concat(min, "min");
    if (h < 24)
        return "".concat(h, "h");
    return "".concat(d, "d");
}
// --- Componente ---
var AppLayout = function (_a) {
    var children = _a.children, activePage = _a.activePage, onNavigate = _a.onNavigate, onLogout = _a.onLogout, nivel = _a.nivel, xpAtual = _a.xpAtual, xpTotal = _a.xpTotal, nomeNivel = _a.nomeNivel;
    var _b = react_1.default.useState(false), isMobileMenuOpen = _b[0], setIsMobileMenuOpen = _b[1];
    var _c = react_1.default.useState(false), dropdownAberto = _c[0], setDropdownAberto = _c[1];
    var _d = react_1.default.useState(''), nomeUsuario = _d[0], setNomeUsuario = _d[1];
    var _e = react_1.default.useState(''), iniciaisUsuario = _e[0], setIniciaisUsuario = _e[1];
    var _f = (0, NotificacoesPage_1.useNotificacoes)(), notificacoes = _f.notificacoes, naoLidas = _f.naoLidas, marcarLida = _f.marcarLida, marcarTodasLidas = _f.marcarTodasLidas;
    var dropdownRef = react_1.default.useRef(null);
    // Carrega nome do usuario
    react_1.default.useEffect(function () {
        var user = firebase_1.auth.currentUser;
        if (!user)
            return;
        (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'usuarios', user.uid)).then(function (snap) {
            if (snap.exists()) {
                var nome = snap.data().nome || '';
                setNomeUsuario(nome);
                setIniciaisUsuario(nome.split(' ').slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase());
            }
        }).catch(function () { });
    }, []);
    // Fecha dropdown ao clicar fora
    react_1.default.useEffect(function () {
        var handler = function (e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownAberto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return function () { return document.removeEventListener('mousedown', handler); };
    }, []);
    return (<div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar_1.Sidebar activePage={activePage} onNavigate={onNavigate} onLogout={onLogout} nivel={nivel} xpAtual={xpAtual} xpTotal={xpTotal} nomeNivel={nomeNivel}/>

      <div className="lg:pl-64 flex flex-col min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600 dark:text-slate-300" onClick={function () { return setIsMobileMenuOpen(true); }}>
              <lucide_react_1.Menu className="w-6 h-6"/>
            </button>
            <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
              <lucide_react_1.Search className="w-4 h-4 text-slate-400"/>
              <input type="text" placeholder="Buscar por analises, registros..." className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-slate-400 text-slate-900 dark:text-slate-100"/>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sino de notificacoes */}
            <div ref={dropdownRef} className="relative">
              <button onClick={function () { return setDropdownAberto(function (p) { return !p; }); }} className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all">
                <lucide_react_1.Bell className="w-5 h-5"/>
                {naoLidas > 0 && (<span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-800">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>)}
              </button>

              {/* Dropdown */}
              <react_2.AnimatePresence>
                {dropdownAberto && (<react_2.motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ duration: 0.15 }} className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                    {/* Header dropdown */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notificacoes</span>
                        {naoLidas > 0 && (<span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            {naoLidas}
                          </span>)}
                      </div>
                      {naoLidas > 0 && (<button onClick={function (e) { e.stopPropagation(); marcarTodasLidas(); }} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                          <lucide_react_1.CheckCheck className="w-3.5 h-3.5"/> Marcar todas
                        </button>)}
                    </div>

                    {/* Lista completa no dropdown */}
                    <div className="max-h-96 overflow-y-auto">
                      {notificacoes.length === 0 ? (<div className="py-8 text-center">
                          <lucide_react_1.Bell className="w-8 h-8 text-slate-200 dark:text-slate-600 mx-auto mb-2"/>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma notificacao</p>
                        </div>) : (notificacoes.map(function (notif) {
                var Icon = ICONE_TIPO[notif.tipo];
                var cor = COR_TIPO[notif.tipo];
                return (<button key={notif.id} onClick={function () { marcarLida(notif.id); setDropdownAberto(false); }} className={"w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0\n                                ".concat(!notif.lida ? 'bg-slate-50/50 dark:bg-slate-700/20' : '')}>
                              <div className={"shrink-0 mt-0.5 ".concat(notif.icone ? 'text-lg' : '')}>
                                {notif.icone
                        ? <span>{notif.icone}</span>
                        : <Icon className={"w-4 h-4 ".concat(cor)}/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={"text-xs font-bold truncate ".concat(notif.lida ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100')}>
                                  {notif.titulo}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                  {notif.mensagem}
                                </p>
                                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                                  {formatarTempo(notif.criadaEm)}
                                </p>
                              </div>
                              {!notif.lida && (<div className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5"/>)}
                            </button>);
            }))}
                    </div>
                  </react_2.motion.div>)}
              </react_2.AnimatePresence>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"/>

            {/* Avatar */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={function () { return onNavigate('profile'); }}>
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{nomeUsuario || 'Meu Perfil'}</p>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{nomeNivel || 'Iniciante'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm">
                {iniciaisUsuario
            ? <span className="text-white text-sm font-black">{iniciaisUsuario}</span>
            : <lucide_react_1.Leaf className="w-5 h-5 text-white"/>}
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="p-8 border-t border-slate-200 dark:border-slate-700 mt-12 text-center text-slate-400 dark:text-slate-500 text-sm transition-colors">
          <p>© 2026 Sustenta — Gestao Inteligente de Consumo e Sustentabilidade</p>
        </footer>
      </div>

      {/* Menu mobile */}
      <react_2.AnimatePresence>
        {isMobileMenuOpen && (<>
            <react_2.motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-[60] lg:hidden" onClick={function () { return setIsMobileMenuOpen(false); }}/>
            <react_2.motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 z-[70] lg:hidden flex flex-col shadow-2xl transition-colors">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-xl">
                    <lucide_react_1.Leaf className="text-white w-5 h-5"/>
                  </div>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">Sustenta</span>
                </div>
                <button className="p-2 text-slate-400 dark:hover:text-slate-200" onClick={function () { return setIsMobileMenuOpen(false); }}>
                  <lucide_react_1.X className="w-6 h-6"/>
                </button>
              </div>
              <Sidebar_1.Sidebar activePage={activePage} onNavigate={function (page) { onNavigate(page); setIsMobileMenuOpen(false); }} onLogout={onLogout} nivel={nivel} xpAtual={xpAtual} xpTotal={xpTotal} nomeNivel={nomeNivel} mobile/>
            </react_2.motion.div>
          </>)}
      </react_2.AnimatePresence>
    </div>);
};
exports.AppLayout = AppLayout;
