import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../../../../src/services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoNotificacao = 'alerta_gasto' | 'conquista' | 'lembrete' | 'familia';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadaEm: Date;
  icone?: string;
}

interface NotificacoesContextType {
  notificacoes: Notificacao[];
  naoLidas: number;
  marcarLida: (id: string) => void;
  marcarTodasLidas: () => void;
  recarregar: () => void;
}

const NotificacoesContext = createContext<NotificacoesContextType>({
  notificacoes: [],
  naoLidas: 0,
  marcarLida: () => {},
  marcarTodasLidas: () => {},
  recarregar: () => {},
});

export const useNotificacoes = () => useContext(NotificacoesContext);

// ─── Chave localStorage para notificações lidas ──────────────────────────────

const LIDAS_KEY = 'sustenta_notif_lidas';

const getLidas = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LIDAS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};

const salvarLidas = (lidas: Set<string>) => {
  localStorage.setItem(LIDAS_KEY, JSON.stringify([...lidas]));
};

// ─── Gerador de notificações ──────────────────────────────────────────────────

async function gerarNotificacoes(): Promise<Omit<Notificacao, 'lida'>[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const notifs: Omit<Notificacao, 'lida'>[] = [];
  const agora = new Date();

  // Busca registros do mês atual
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const q = query(
    collection(db, 'registros'),
    where('uid', '==', user.uid),
    where('mes', '==', mesAtual)
  );
  const snap = await getDocs(q);
  const registros = snap.docs.map(d => d.data());

  const energia = registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
  const agua    = registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
  const subs: Record<string, number> = {};
  registros.filter(r => r.categoria === 'outro').forEach(r => {
    const nome = r.subcategoria || 'Outro';
    subs[nome] = (subs[nome] || 0) + r.valor;
  });

  // ── Alertas de gasto alto ────────────────────────────────────────────────

  if (energia > 200) {
    notifs.push({
      id: `alerta_energia_${mesAtual}`,
      tipo: 'alerta_gasto',
      titulo: 'Energia acima do limite',
      mensagem: `Seu gasto com energia em ${mesAtual} é R$ ${energia.toFixed(2)}, acima do limite de R$ 200. Considere reduzir o consumo.`,
      criadaEm: new Date(agora.getTime() - 1000 * 60 * 30),
      icone: '⚡',
    });
  }

  if (agua > 100) {
    notifs.push({
      id: `alerta_agua_${mesAtual}`,
      tipo: 'alerta_gasto',
      titulo: 'Água acima do limite',
      mensagem: `Seu gasto com água em ${mesAtual} é R$ ${agua.toFixed(2)}, acima do limite de R$ 100. Verifique possíveis vazamentos.`,
      criadaEm: new Date(agora.getTime() - 1000 * 60 * 45),
      icone: '💧',
    });
  }

  Object.entries(subs).forEach(([nome, val]) => {
    if (val > 300) {
      notifs.push({
        id: `alerta_sub_${nome}_${mesAtual}`,
        tipo: 'alerta_gasto',
        titulo: `${nome} acima do limite`,
        mensagem: `Seu gasto com ${nome} chegou a R$ ${val.toFixed(2)} este mês, acima de R$ 300.`,
        criadaEm: new Date(agora.getTime() - 1000 * 60 * 60),
        icone: '📊',
      });
    }
  });

  // ── Conquistas de XP / nível ─────────────────────────────────────────────

  const totalRegistros = snap.size;

  if (totalRegistros >= 1) {
    notifs.push({
      id: `conquista_primeiro_registro`,
      tipo: 'conquista',
      titulo: 'Primeiro registro realizado! 🎉',
      mensagem: 'Você deu o primeiro passo! Continue registrando para melhorar seu score.',
      criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 24),
      icone: '🌱',
    });
  }

  if (totalRegistros >= 5) {
    notifs.push({
      id: `conquista_5_registros`,
      tipo: 'conquista',
      titulo: 'Você atingiu 5 registros!',
      mensagem: `Parabéns! Você já tem ${totalRegistros} registros e ganhou ${totalRegistros * 100} XP no total.`,
      criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 2),
      icone: '🏆',
    });
  }

  // ── Lembrete mensal ──────────────────────────────────────────────────────

  const diaDoMes = agora.getDate();
  if (totalRegistros === 0 && diaDoMes > 5) {
    notifs.push({
      id: `lembrete_${mesAtual}`,
      tipo: 'lembrete',
      titulo: 'Você ainda não registrou este mês',
      mensagem: 'Não esqueça de registrar seus gastos de energia, água e outros para manter seu score atualizado.',
      criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 3),
      icone: '📅',
    });
  }

  // ── Grupo familiar ───────────────────────────────────────────────────────

  try {
    const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
    const grupoId  = userSnap.data()?.grupoFamiliaId;
    if (grupoId) {
      const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));
      if (grupoSnap.exists()) {
        const grupo = grupoSnap.data();
        if (grupo.membros?.length > 1) {
          notifs.push({
            id: `familia_${grupoId}`,
            tipo: 'familia',
            titulo: 'Grupo familiar ativo!',
            mensagem: `Seu grupo "${grupo.nome}" tem ${grupo.membros.length} membros ativos monitorando o consumo juntos.`,
            criadaEm: new Date(agora.getTime() - 1000 * 60 * 60 * 5),
            icone: '👨‍👩‍👧',
          });
        }
      }
    }
  } catch { /* ignora */ }

  // Ordena por data mais recente
  return notifs.sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime());
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificacoesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidas,        setLidas]        = useState<Set<string>>(getLidas);

  const carregar = useCallback(async () => {
    const raw = await gerarNotificacoes();
    const lidasAtual = getLidas();
    setNotificacoes(raw.map(n => ({ ...n, lida: lidasAtual.has(n.id) })));
  }, []);

  // Recarrega ao logar
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) carregar();
      else setNotificacoes([]);
    });
    return unsub;
  }, [carregar]);

  // Recarrega a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(carregar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregar]);

  const marcarLida = (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setLidas(prev => {
      const novo = new Set(prev); novo.add(id);
      salvarLidas(novo);
      return novo;
    });
  };

  const marcarTodasLidas = () => {
    const ids = notificacoes.map(n => n.id);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setLidas(prev => {
      const novo = new Set(prev);
      ids.forEach(id => novo.add(id));
      salvarLidas(novo);
      return novo;
    });
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <NotificacoesContext.Provider value={{ notificacoes, naoLidas, marcarLida, marcarTodasLidas, recarregar: carregar }}>
      {children}
    </NotificacoesContext.Provider>
  );
};