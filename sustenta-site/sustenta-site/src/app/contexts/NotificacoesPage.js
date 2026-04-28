"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificacoesProvider = exports.useNotificacoes = void 0;
var react_1 = require("react");
var firebase_1 = require("../../services/firebase");
var firestore_1 = require("firebase/firestore");
var NotificacoesContext = (0, react_1.createContext)({
    notificacoes: [],
    naoLidas: 0,
    marcarLida: function () { },
    marcarTodasLidas: function () { },
    recarregar: function () { },
});
var useNotificacoes = function () { return (0, react_1.useContext)(NotificacoesContext); };
exports.useNotificacoes = useNotificacoes;
// ─── Chave localStorage para notificações lidas ──────────────────────────────
var LIDAS_KEY = 'sustenta_notif_lidas';
var getLidas = function () {
    try {
        var raw = localStorage.getItem(LIDAS_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    }
    catch (_a) {
        return new Set();
    }
};
var salvarLidas = function (lidas) {
    localStorage.setItem(LIDAS_KEY, JSON.stringify(__spreadArray([], lidas, true)));
};
// ─── Gerador de notificações ──────────────────────────────────────────────────
function gerarNotificacoes() {
    return __awaiter(this, void 0, void 0, function () {
        var user, notifs, agora, mesAtual, q, snap, registros, energia, agua, subs, totalRegistros, diaDoMes, userSnap, grupoId, grupoSnap, grupo, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    user = firebase_1.auth.currentUser;
                    if (!user)
                        return [2 /*return*/, []];
                    notifs = [];
                    agora = new Date();
                    mesAtual = "".concat(agora.getFullYear(), "-").concat(String(agora.getMonth() + 1).padStart(2, '0'));
                    q = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'registros'), (0, firestore_1.where)('uid', '==', user.uid), (0, firestore_1.where)('mes', '==', mesAtual));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(q)];
                case 1:
                    snap = _d.sent();
                    registros = snap.docs.map(function (d) { return d.data(); });
                    energia = registros.filter(function (r) { return r.categoria === 'energia'; }).reduce(function (s, r) { return s + r.valor; }, 0);
                    agua = registros.filter(function (r) { return r.categoria === 'agua'; }).reduce(function (s, r) { return s + r.valor; }, 0);
                    subs = {};
                    registros.filter(function (r) { return r.categoria === 'outro'; }).forEach(function (r) {
                        var nome = r.subcategoria || 'Outro';
                        subs[nome] = (subs[nome] || 0) + r.valor;
                    });
                    // ── Alertas de gasto alto ────────────────────────────────────────────────
                    if (energia > 200) {
                        notifs.push({
                            id: "alerta_energia_".concat(mesAtual),
                            tipo: 'alerta_gasto',
                            titulo: 'Energia acima do limite',
                            mensagem: "Seu gasto com energia em ".concat(mesAtual, " \u00E9 R$ ").concat(energia.toFixed(2), ", acima do limite de R$ 200. Considere reduzir o consumo."),
                            criadaEm: new Date(agora.getTime() - 1000 * 60 * 30),
                            icone: '⚡',
                        });
                    }
                    if (agua > 100) {
                        notifs.push({
                            id: "alerta_agua_".concat(mesAtual),
                            tipo: 'alerta_gasto',
                            titulo: 'Água acima do limite',
                            mensagem: "Seu gasto com \u00E1gua em ".concat(mesAtual, " \u00E9 R$ ").concat(agua.toFixed(2), ", acima do limite de R$ 100. Verifique poss\u00EDveis vazamentos."),
                            criadaEm: new Date(agora.getTime() - 1000 * 60 * 45),
                            icone: '💧',
                        });
                    }
                    Object.entries(subs).forEach(function (_a) {
                        var nome = _a[0], val = _a[1];
                        if (val > 300) {
                            notifs.push({
                                id: "alerta_sub_".concat(nome, "_").concat(mesAtual),
                                tipo: 'alerta_gasto',
                                titulo: "".concat(nome, " acima do limite"),
                                mensagem: "Seu gasto com ".concat(nome, " chegou a R$ ").concat(val.toFixed(2), " este m\u00EAs, acima de R$ 300."),
                                criadaEm: new Date(agora.getTime() - 1000 * 60 * 60),
                                icone: '📊',
                            });
                        }
                    });
                    totalRegistros = snap.size;
                    if (totalRegistros >= 1) {
                        notifs.push({
                            id: "conquista_primeiro_registro",
                            tipo: 'conquista',
                            titulo: 'Primeiro registro realizado! 🎉',
                            mensagem: 'Você deu o primeiro passo! Continue registrando para melhorar seu score.',
                            criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 24),
                            icone: '🌱',
                        });
                    }
                    if (totalRegistros >= 5) {
                        notifs.push({
                            id: "conquista_5_registros",
                            tipo: 'conquista',
                            titulo: 'Você atingiu 5 registros!',
                            mensagem: "Parab\u00E9ns! Voc\u00EA j\u00E1 tem ".concat(totalRegistros, " registros e ganhou ").concat(totalRegistros * 100, " XP no total."),
                            criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 2),
                            icone: '🏆',
                        });
                    }
                    diaDoMes = agora.getDate();
                    if (totalRegistros === 0 && diaDoMes > 5) {
                        notifs.push({
                            id: "lembrete_".concat(mesAtual),
                            tipo: 'lembrete',
                            titulo: 'Você ainda não registrou este mês',
                            mensagem: 'Não esqueça de registrar seus gastos de energia, água e outros para manter seu score atualizado.',
                            criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 3),
                            icone: '📅',
                        });
                    }
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'usuarios', user.uid))];
                case 3:
                    userSnap = _d.sent();
                    grupoId = (_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.grupoFamiliaId;
                    if (!grupoId) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'grupos_familia', grupoId))];
                case 4:
                    grupoSnap = _d.sent();
                    if (grupoSnap.exists()) {
                        grupo = grupoSnap.data();
                        if (((_c = grupo.membros) === null || _c === void 0 ? void 0 : _c.length) > 1) {
                            notifs.push({
                                id: "familia_".concat(grupoId),
                                tipo: 'familia',
                                titulo: 'Grupo familiar ativo!',
                                mensagem: "Seu grupo \"".concat(grupo.nome, "\" tem ").concat(grupo.membros.length, " membros ativos monitorando o consumo juntos."),
                                criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 5),
                                icone: '👨‍👩‍👧',
                            });
                        }
                    }
                    _d.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    _a = _d.sent();
                    return [3 /*break*/, 7];
                case 7: 
                // Ordena por data mais recente
                return [2 /*return*/, notifs.sort(function (a, b) { return b.criadaEm.getTime() - a.criadaEm.getTime(); })];
            }
        });
    });
}
// ─── Provider ─────────────────────────────────────────────────────────────────
var NotificacoesProvider = function (_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)([]), notificacoes = _b[0], setNotificacoes = _b[1];
    var _c = (0, react_1.useState)(getLidas), lidas = _c[0], setLidas = _c[1];
    var carregar = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var raw, lidasAtual;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, gerarNotificacoes()];
                case 1:
                    raw = _a.sent();
                    lidasAtual = getLidas();
                    setNotificacoes(raw.map(function (n) { return (__assign(__assign({}, n), { lida: lidasAtual.has(n.id) })); }));
                    return [2 /*return*/];
            }
        });
    }); }, []);
    // Recarrega ao logar
    (0, react_1.useEffect)(function () {
        var unsub = firebase_1.auth.onAuthStateChanged(function (user) {
            if (user)
                carregar();
            else
                setNotificacoes([]);
        });
        return unsub;
    }, [carregar]);
    // Recarrega a cada 5 minutos
    (0, react_1.useEffect)(function () {
        var interval = setInterval(carregar, 5 * 60 * 1000);
        return function () { return clearInterval(interval); };
    }, [carregar]);
    var marcarLida = function (id) {
        setNotificacoes(function (prev) { return prev.map(function (n) { return n.id === id ? __assign(__assign({}, n), { lida: true }) : n; }); });
        setLidas(function (prev) {
            var novo = new Set(prev);
            novo.add(id);
            salvarLidas(novo);
            return novo;
        });
    };
    var marcarTodasLidas = function () {
        var ids = notificacoes.map(function (n) { return n.id; });
        setNotificacoes(function (prev) { return prev.map(function (n) { return (__assign(__assign({}, n), { lida: true })); }); });
        setLidas(function (prev) {
            var novo = new Set(prev);
            ids.forEach(function (id) { return novo.add(id); });
            salvarLidas(novo);
            return novo;
        });
    };
    var naoLidas = notificacoes.filter(function (n) { return !n.lida; }).length;
    return (<NotificacoesContext.Provider value={{ notificacoes: notificacoes, naoLidas: naoLidas, marcarLida: marcarLida, marcarTodasLidas: marcarTodasLidas, recarregar: carregar }}>
      {children}
    </NotificacoesContext.Provider>);
};
exports.NotificacoesProvider = NotificacoesProvider;
