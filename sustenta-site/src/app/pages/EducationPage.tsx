import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Play, Brain, Wind, Leaf, Zap, Droplets,
  ChevronDown, Trophy, CheckCircle, XCircle, RotateCcw,
  Sparkles, Calculator, ArrowRight, Loader2,
  Award, Globe, Clock, BarChart3,
  ChevronRight, Search, Star, Flame,
  Crown, Timer, Bolt, Eye, CheckSquare,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  collection, query, where, getDocs, doc, getDoc,
  setDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';

// --- Types -------------------------------------------------------------------

interface Registro { categoria: 'energia' | 'agua' | 'outro'; valor: number; mes: string; }
interface UserProgress {
  artigosLidos: string[];
  quizzesCompletos: { catId: string; acertos: number; total: number; data: any }[];
  desafiosAceitos: string[];
  xpEducacao: number;
}
interface RankingEntry { uid: string; nome: string; xp: number; posicao?: number; }
interface Noticia {
  id: string;
  titulo: string;
  descricao: string;
  fonte: string;
  autor: string | null;
  urlOriginal: string;
  urlImagem: string | null;
  publicadoEm: string;
  categoria: string;
  cachadoEm: number;
}

// --- NewsAPI Content ---------------------------------------------------------

const NOTICIAS_CATEGORIAS = [
  {
    id: 'sustentabilidade',
    label: 'Sustentabilidade',
    query: 'sustentabilidade OR meio ambiente OR ecologia Brasil',
    icon: Leaf,
    gradiente: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'energia',
    label: 'Energia',
    query: 'energia solar OR energia renovavel OR energia limpa Brasil',
    icon: Zap,
    gradiente: 'from-amber-500 to-yellow-500',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'agua',
    label: 'Agua',
    query: 'crise hidrica OR saneamento basico OR escassez agua Brasil',
    icon: Droplets,
    gradiente: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'clima',
    label: 'Clima',
    query: 'mudancas climaticas OR aquecimento global OR desmatamento Brasil',
    icon: Wind,
    gradiente: 'from-green-500 to-emerald-500',
    badge: 'bg-green-500/15 text-green-300 border-green-500/30',
  },
  {
    id: 'residuos',
    label: 'Residuos',
    query: 'reciclagem OR residuos solidos OR economia circular Brasil',
    icon: Globe,
    gradiente: 'from-violet-500 to-indigo-500',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
];

const NEWS_API_KEY = '38f40c25135041e9a3e8c7a39a39727f';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

async function buscarNoticiaCache(categoriaId: string): Promise<Noticia[] | null> {
  try {
    const snap = await getDoc(doc(db, 'noticias_cache', categoriaId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (Date.now() - data.cachadoEm > CACHE_TTL_MS) return null;
    return data.noticias as Noticia[];
  } catch { return null; }
}

async function salvarNoticiaCache(categoriaId: string, noticias: Noticia[]) {
  try {
    await setDoc(doc(db, 'noticias_cache', categoriaId), { noticias, cachadoEm: Date.now() });
  } catch {}
}

async function buscarNoticias(categoria: typeof NOTICIAS_CATEGORIAS[0]): Promise<Noticia[]> {
  const cached = await buscarNoticiaCache(categoria.id);
  if (cached) return cached;

  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', categoria.query);
  url.searchParams.set('language', 'pt');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', '8');
  url.searchParams.set('apiKey', NEWS_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message ?? 'Erro na NewsAPI');

  const noticias: Noticia[] = (data.articles ?? [])
    .filter((a: any) => a.title && a.title !== '[Removed]' && a.description)
    .map((a: any, i: number) => ({
      id: `${categoria.id}-${i}`,
      titulo: a.title,
      descricao: a.description ?? '',
      fonte: a.source?.name ?? 'Desconhecido',
      autor: a.author ?? null,
      urlOriginal: a.url,
      urlImagem: a.urlToImage ?? null,
      publicadoEm: a.publishedAt,
      categoria: categoria.label,
      cachadoEm: Date.now(),
    }));

  await salvarNoticiaCache(categoria.id, noticias);
  return noticias;
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// --- Static Content ----------------------------------------------------------

const VIDEOS = [
  { id: 'v1', titulo: 'A historia das coisas', canal: 'Story of Stuff Project', duracao: '21:16', youtubeId: 'gLBE5QAYXp8', descricao: 'O documentario que mudou a visao de consumo de milhoes de pessoas.', cor: 'from-emerald-600 to-teal-700', tag: 'Consumo' },
  { id: 'v2', titulo: 'Aquecimento global explicado', canal: 'Kurzgesagt', duracao: '8:32', youtubeId: 'wbR-5mHI6bo', descricao: 'Animacao cientifica premiada sobre mudancas climaticas.', cor: 'from-blue-600 to-indigo-700', tag: 'Clima' },
  { id: 'v3', titulo: 'Como funciona a energia solar', canal: 'Manual do Mundo', duracao: '12:05', youtubeId: 'RnvCbquYeIM', descricao: 'Tudo sobre paineis fotovoltaicos de forma didatica e pratica.', cor: 'from-yellow-600 to-orange-700', tag: 'Energia' },
  { id: 'v4', titulo: 'Crise da agua no Brasil', canal: 'Reporter Brasil', duracao: '14:22', youtubeId: 'f3F_GFMnMbA', descricao: 'Investigacao jornalistica sobre o futuro da agua no pais.', cor: 'from-cyan-600 to-blue-700', tag: 'Agua' },
  { id: 'v5', titulo: 'Compostagem em apartamento', canal: 'Horta em Casa', duracao: '9:44', youtubeId: 'bEAbxRpMfzU', descricao: 'Guia pratico para compostar em espacos pequenos.', cor: 'from-green-600 to-emerald-700', tag: 'Residuos' },
  { id: 'v6', titulo: 'Economia circular na pratica', canal: 'SEBRAE', duracao: '6:18', youtubeId: 'G4H1N_yXBiA', descricao: 'Casos reais de empresas brasileiras que eliminaram o lixo.', cor: 'from-violet-600 to-purple-700', tag: 'Economia' },
];

const QUIZ_CATEGORIAS = [
  {
    id: 'energia', label: 'Energia', icon: Zap, cor: 'from-amber-500 to-yellow-500',
    perguntas: [
      { p: 'Qual aparelho consome mais energia em residencias?', ops: ['Televisao', 'Ar-condicionado', 'Computador', 'Roteador Wi-Fi'], c: 1, exp: 'O ar-condicionado consome entre 1.200 e 3.500W, enquanto uma TV LED moderna usa apenas 50-150W.' },
      { p: 'Quanto uma lampada LED economiza vs. incandescente?', ops: ['30-40%', '50-60%', '70-80%', '85-90%'], c: 2, exp: 'Uma LED de 10W produz a mesma luz que uma incandescente de 60W, economia de 83%.' },
      { p: 'Qual e o payback medio de energia solar residencial no Brasil?', ops: ['1-2 anos', '4-6 anos', '10-12 anos', '15-20 anos'], c: 1, exp: 'O payback medio e de 4-6 anos. Apos isso, a energia e gratuita por mais 15-20 anos.' },
    ],
  },
  {
    id: 'agua', label: 'Agua', icon: Droplets, cor: 'from-blue-500 to-cyan-500',
    perguntas: [
      { p: 'Qual % da agua doce planetaria esta em rios e lagos acessiveis?', ops: ['3%', '10%', '0,3%', '25%'], c: 2, exp: 'Apenas 0,3% esta em rios, lagos e reservatorios superficiais acessiveis.' },
      { p: 'Quantos litros/dia desperdiça um vazamento silencioso no vaso?', ops: ['5 litros', '40 litros', '100 litros', '200 litros'], c: 1, exp: 'Um vaso com vazamento silencioso desperdiça entre 30-100 litros por dia (media de 40L).' },
      { p: 'Qual atividade humana consome mais agua doce mundial?', ops: ['Uso domestico', 'Industria', 'Agricultura', 'Energia'], c: 2, exp: 'A agricultura consome 70% de toda a agua doce utilizada. A irrigacao e o principal uso.' },
    ],
  },
  {
    id: 'clima', label: 'Clima', icon: Globe, cor: 'from-emerald-500 to-teal-500',
    perguntas: [
      { p: 'Qual e a meta de temperatura do Acordo de Paris?', ops: ['Limitar a 1C', 'Limitar a 1,5-2C', 'Limitar a 3C', 'Estabilizar no nivel atual'], c: 1, exp: 'O Acordo de Paris (2015) busca limitar o aquecimento a 1,5C acima dos niveis pre-industriais.' },
      { p: 'Qual alimento tem maior pegada de carbono por kg?', ops: ['Frango', 'Porco', 'Carne bovina', 'Salmao'], c: 2, exp: 'A carne bovina emite 20-60 kg de CO2 por kg produzido. Frango emite apenas ~6 kg/kg.' },
      { p: 'Quantas arvores absorvem 1 tonelada de CO2 por ano?', ops: ['5 arvores', '10 arvores', '46 arvores', '100 arvores'], c: 2, exp: 'Uma arvore adulta absorve em media 21,7 kg de CO2 por ano. Para 1 tonelada sao necessarias ~46 arvores.' },
    ],
  },
  {
    id: 'biodiversidade', label: 'Biodiversidade', icon: Leaf, cor: 'from-violet-500 to-indigo-500',
    perguntas: [
      { p: 'Qual e a taxa atual de extincao de especies vs. natural?', ops: ['2x', '10x', '100x', '1.000x'], c: 3, exp: 'A taxa atual e estimada em 1.000 vezes mais rapida que a natural. Estamos na 6a extincao em massa.' },
      { p: 'Qual bioma brasileiro e mais biodiverso por km2?', ops: ['Amazonia', 'Cerrado', 'Mata Atlantica', 'Pantanal'], c: 2, exp: 'A Mata Atlantica e o bioma mais biodiverso por km2 do planeta, com mais de 20.000 especies de plantas.' },
      { p: 'Qual % das culturas alimentares sao polinizadas por abelhas?', ops: ['25%', '50%', '75%', '95%'], c: 2, exp: 'As abelhas polinizam cerca de 75% das especies de plantas que produzem alimentos para humanos.' },
    ],
  },
];

const DESAFIOS_SEMANA = [
  { id: 'd0', emoji: '💡', titulo: 'Desafio do Dia: LED na Sala', descricao: 'Substitua hoje uma lampada incandescente por LED. Economia estimada: R$ 8/mes.', xp: 150, cor: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30', tag: 'Energia' },
  { id: 'd1', emoji: '🚿', titulo: 'Desafio do Dia: Banho de 5 Minutos', descricao: 'Cronometre seu banho hoje. 5 minutos = 45 litros economizados por banho.', xp: 100, cor: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', tag: 'Agua' },
  { id: 'd2', emoji: '🔌', titulo: 'Desafio do Dia: Zero Stand-by', descricao: 'Desligue todos os aparelhos da tomada ao dormir. Economia de ate 12% na conta.', xp: 120, cor: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/30', tag: 'Energia' },
  { id: 'd3', emoji: '🥗', titulo: 'Desafio do Dia: Refeicao Verde', descricao: 'Substitua uma refeicao com carne por uma vegetariana. Reduz ate 2 kg de CO2.', xp: 200, cor: 'from-green-500/20 to-emerald-500/10', border: 'border-green-500/30', tag: 'Clima' },
  { id: 'd4', emoji: '♻️', titulo: 'Desafio do Dia: Separar o Lixo', descricao: 'Separe corretamente o lixo hoje: organico, reciclavel e rejeito.', xp: 80, cor: 'from-teal-500/20 to-cyan-500/10', border: 'border-teal-500/30', tag: 'Residuos' },
  { id: 'd5', emoji: '🚌', titulo: 'Desafio do Dia: Transporte Sustentavel', descricao: 'Use transporte publico, bicicleta ou va a pe em um deslocamento hoje.', xp: 180, cor: 'from-indigo-500/20 to-blue-500/10', border: 'border-indigo-500/30', tag: 'Clima' },
  { id: 'd6', emoji: '🌱', titulo: 'Desafio do Dia: Plantar uma Semente', descricao: 'Plante uma semente ou mude hoje. Cada planta absorve CO2 e melhora o microclima.', xp: 150, cor: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', tag: 'Biodiversidade' },
];

const CARBON_FACTORS = { energia: 0.083, agua: 0.021, outro: 0.045 };
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL  = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getMesLabel(m: string, short = false) {
  const [ano, mes] = m.split('-');
  return short ? `${MESES_SHORT[+mes-1]}/${ano.slice(2)}` : `${MESES_FULL[+mes-1]} ${ano}`;
}

function calcularCarbono(registros: Registro[]) {
  const energiaKg = registros.filter(r=>r.categoria==='energia').reduce((s,r)=>s+r.valor*CARBON_FACTORS.energia,0);
  const aguaKg    = registros.filter(r=>r.categoria==='agua').reduce((s,r)=>s+r.valor*CARBON_FACTORS.agua,0);
  const outroKg   = registros.filter(r=>r.categoria==='outro').reduce((s,r)=>s+r.valor*CARBON_FACTORS.outro,0);
  const totalKg   = energiaKg + aguaKg + outroKg;
  return { totalKg, energiaKg, aguaKg, outroKg,
    arvoresTotais: Math.ceil(totalKg/21.7),
    kmCarro: Math.round(totalKg/0.21),
    horasAviao: +(totalKg/90).toFixed(1),
  };
}

async function gerarDicaIA(e: number, a: number, o: number, kg: number): Promise<string> {
  const maior = e >= a && e >= o ? 'energia eletrica' : a >= o ? 'agua' : 'outros gastos';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `Consultor de sustentabilidade brasileiro. Dados mensais: Energia R$${e.toFixed(2)}, Agua R$${a.toFixed(2)}, Outros R$${o.toFixed(2)}, CO2 total ${kg.toFixed(1)}kg, maior gasto: ${maior}. Escreva analise personalizada de 3-4 frases em portugues brasileiro com: avaliacao do nivel atual, acao concreta para a categoria principal e impacto estimado com numeros.` }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? 'Continue reduzindo seu consumo!';
}

// --- Firebase Helpers --------------------------------------------------------

async function carregarProgresso(uid: string): Promise<UserProgress> {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.data();
    return {
      artigosLidos:     data?.educacao?.artigosLidos     ?? [],
      quizzesCompletos: data?.educacao?.quizzesCompletos ?? [],
      desafiosAceitos:  data?.educacao?.desafiosAceitos  ?? [],
      xpEducacao:       data?.educacao?.xpEducacao       ?? 0,
    };
  } catch { return { artigosLidos: [], quizzesCompletos: [], desafiosAceitos: [], xpEducacao: 0 }; }
}

async function salvarArtigoLido(uid: string, artigoId: string) {
  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.artigosLidos': arrayUnion(artigoId),
    'educacao.xpEducacao': 50,
  });
}

async function salvarQuizCompleto(uid: string, catId: string, acertos: number, total: number, xpGanho: number, nomeUsuario: string) {
  const entry = { catId, acertos, total, data: serverTimestamp() };
  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.quizzesCompletos': arrayUnion(entry),
    'educacao.xpEducacao': xpGanho,
  });
  const rankRef = doc(db, 'ranking_educacao', uid);
  const rankSnap = await getDoc(rankRef);
  const xpAtual = rankSnap.exists() ? (rankSnap.data().xp ?? 0) : 0;
  await setDoc(rankRef, { uid, nome: nomeUsuario, xp: xpAtual + xpGanho, updatedAt: serverTimestamp() }, { merge: true });
}

async function salvarDesafioAceito(uid: string, desafioId: string, xp: number, nomeUsuario: string) {
  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.desafiosAceitos': arrayUnion(desafioId),
    'educacao.xpEducacao': xp,
  });
  const rankRef = doc(db, 'ranking_educacao', uid);
  const rankSnap = await getDoc(rankRef);
  const xpAtual = rankSnap.exists() ? (rankSnap.data().xp ?? 0) : 0;
  await setDoc(rankRef, { uid, nome: nomeUsuario, xp: xpAtual + xp, updatedAt: serverTimestamp() }, { merge: true });
}

async function carregarRanking(): Promise<RankingEntry[]> {
  try {
    const q = query(collection(db, 'ranking_educacao'), orderBy('xp', 'desc'), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({ ...d.data() as RankingEntry, posicao: i + 1 }));
  } catch { return []; }
}

// --- Glass Card --------------------------------------------------------------

function GlassCard({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <motion.div
      whileHover={glow ? { scale: 1.01, boxShadow: '0 0 30px rgba(34,197,94,0.08)' } : undefined}
      className={clsx('rounded-2xl border backdrop-blur-sm transition-colors bg-white/5 border-white/10 hover:border-white/20', className)}
    >
      {children}
    </motion.div>
  );
}

// --- Confetti ----------------------------------------------------------------

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100, delay: Math.random() * 0.4,
    color: ['#22c55e','#eab308','#3b82f6','#a78bfa','#f97316'][i % 5],
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map((p, i) => (
        <motion.div key={i}
          initial={{ y: -10, x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: '110%', opacity: 0, rotate: 360 * (Math.random() > 0.5 ? 1 : -1) }}
          transition={{ duration: 1.2 + Math.random() * 0.5, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

// --- Tab Button --------------------------------------------------------------

function TabBtn({ label, icon: Icon, active, onClick, badge }: {
  label: string; icon: any; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.96 }}
      className={clsx(
        'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
        active ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-900/40'
               : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon size={15} />
      {label}
      {!!badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

// --- Daily Challenge ---------------------------------------------------------

function DesafioCard({ progress, onAceitarDesafio }: {
  progress: UserProgress | null;
  onAceitarDesafio: (desafio: typeof DESAFIOS_SEMANA[0]) => void;
}) {
  const desafio = DESAFIOS_SEMANA[new Date().getDay()];
  const jaAceito = progress?.desafiosAceitos.includes(desafio.id) ?? false;
  const [aceitando, setAceitando] = useState(false);

  async function handleAceitar() {
    if (jaAceito || aceitando) return;
    setAceitando(true);
    await onAceitarDesafio(desafio);
    setAceitando(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={clsx('rounded-2xl border p-5 backdrop-blur-sm relative overflow-hidden', desafio.cor, desafio.border)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/3 blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0 mt-0.5">{desafio.emoji}</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Desafio do Dia</span>
              <span className="text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{desafio.tag}</span>
            </div>
            <p className="font-bold text-white text-sm">{desafio.titulo.replace('Desafio do Dia: ','')}</p>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">{desafio.descricao}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded-lg border border-emerald-700/40">
            +{desafio.xp} XP
          </span>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={handleAceitar} disabled={jaAceito || aceitando}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
              jaAceito ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 cursor-default'
                       : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            )}
          >
            {aceitando ? <Loader2 size={11} className="animate-spin" />
              : jaAceito ? <><CheckCircle size={11} /> Aceito!</>
              : <><Bolt size={11} /> Aceitar</>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Noticia Card ------------------------------------------------------------

function NoticiaCard({ noticia, index }: { noticia: Noticia; index: number }) {
  const [expandida, setExpandida] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all overflow-hidden"
    >
      {noticia.urlImagem && (
        <div className="relative h-40 overflow-hidden">
          <img src={noticia.urlImagem} alt={noticia.titulo} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white/70 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {noticia.fonte}
          </span>
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {!noticia.urlImagem && (
            <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{noticia.fonte}</span>
          )}
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock size={9} /> {formatarData(noticia.publicadoEm)}
          </span>
          {noticia.autor && (
            <span className="text-[10px] text-slate-500 truncate max-w-[140px]">por {noticia.autor.split(',')[0]}</span>
          )}
        </div>
        <h3 className="font-bold text-white text-sm leading-snug line-clamp-3">{noticia.titulo}</h3>
        <p className={clsx('text-xs text-slate-400 leading-relaxed', expandida ? '' : 'line-clamp-2')}>
          {noticia.descricao}
        </p>
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => setExpandida(v => !v)}
            className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1">
            {expandida ? 'Ver menos' : 'Ver mais'}
            <ChevronDown size={11} className={clsx('transition-transform', expandida && 'rotate-180')} />
          </button>
          <a href={noticia.urlOriginal} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Ler artigo completo <ChevronRight size={11} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// --- Artigos Tab (NewsAPI) ---------------------------------------------------

function ArtigosTab({ progress, onArtigoLido }: {
  progress: UserProgress | null;
  onArtigoLido: (id: string) => void;
}) {
  const [catAtiva, setCatAtiva]   = useState(NOTICIAS_CATEGORIAS[0]);
  const [busca, setBusca]         = useState('');
  const [noticias, setNoticias]   = useState<Noticia[]>([]);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState<string | null>(null);
  const [ultimaAtt, setUltimaAtt] = useState<Date | null>(null);

  useEffect(() => { carregar(catAtiva); }, [catAtiva]);

  async function carregar(cat: typeof NOTICIAS_CATEGORIAS[0], forceRefresh = false) {
    setLoading(true); setErro(null); setNoticias([]);
    try {
      if (forceRefresh) {
        try { await setDoc(doc(db, 'noticias_cache', cat.id), { noticias: [], cachadoEm: 0 }); } catch {}
      }
      const resultado = await buscarNoticias(cat);
      setNoticias(resultado);
      setUltimaAtt(new Date());
      if (progress && !progress.artigosLidos.includes(`news-${cat.id}`)) {
        onArtigoLido(`news-${cat.id}`);
      }
    } catch (e: any) {
      if (e.message?.includes('426') || e.message?.includes('upgrade')) {
        setErro('O plano gratuito da NewsAPI so funciona em localhost. Para producao, e necessario um proxy de servidor.');
      } else {
        setErro('Nao foi possivel carregar as noticias. Verifique sua conexao e tente novamente.');
      }
    } finally { setLoading(false); }
  }

  const noticiasFiltradas = noticias.filter(n =>
    busca === '' ||
    n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    n.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-600/10 border border-blue-500/20">
        <Sparkles size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300 leading-relaxed">
          Noticias reais e recentes via NewsAPI em portugues. Cache de 1h para economizar requisicoes.
          {' '}<span className="text-blue-400 font-semibold">Nota:</span> em producao (Vercel), sera necessario um proxy de servidor.
        </p>
      </div>

      {/* Filtro de categorias */}
      <div className="flex gap-2 flex-wrap">
        {NOTICIAS_CATEGORIAS.map(cat => {
          const Icon = cat.icon;
          return (
            <motion.button key={cat.id} whileTap={{ scale: 0.95 }} onClick={() => setCatAtiva(cat)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium',
                catAtiva.id === cat.id
                  ? `bg-gradient-to-r ${cat.gradiente} text-white border-transparent shadow-lg`
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
              )}
            >
              <Icon size={11} /> {cat.label}
            </motion.button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Filtrar noticias carregadas..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {/* Header + atualizar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(() => { const Icon = catAtiva.icon; return <Icon size={14} className="text-slate-400" />; })()}
          <span className="text-sm font-semibold text-white">{catAtiva.label}</span>
          {ultimaAtt && !loading && (
            <span className="text-[10px] text-slate-500">
              · atualizado {ultimaAtt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button onClick={() => carregar(catAtiva, true)} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40">
          <RotateCcw size={11} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
              <div className="h-40 bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-4/5" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Erro */}
      {erro && !loading && (
        <GlassCard className="p-6 text-center space-y-3 border-red-500/20 bg-red-600/5">
          <p className="text-sm font-semibold text-red-300">Nao foi possivel carregar as noticias</p>
          <p className="text-xs text-slate-400 leading-relaxed">{erro}</p>
          <button onClick={() => carregar(catAtiva)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all mx-auto">
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </GlassCard>
      )}

      {/* Noticias */}
      {!loading && !erro && noticiasFiltradas.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {noticiasFiltradas.length} noticia{noticiasFiltradas.length !== 1 ? 's' : ''} encontrada{noticiasFiltradas.length !== 1 ? 's' : ''}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {noticiasFiltradas.map((n, i) => <NoticiaCard key={n.id} noticia={n} index={i} />)}
          </div>
        </>
      )}

      {!loading && !erro && noticiasFiltradas.length === 0 && noticias.length > 0 && (
        <GlassCard className="p-10 text-center">
          <p className="text-slate-400 text-sm">Nenhuma noticia encontrada para "{busca}".</p>
        </GlassCard>
      )}
    </div>
  );
}

// --- Videos Tab --------------------------------------------------------------

function VideosTab() {
  const [playing, setPlaying] = useState<string | null>(null);
  const tags = ['Todos', 'Consumo', 'Clima', 'Energia', 'Agua', 'Residuos', 'Economia'];
  const [tagAtiva, setTagAtiva] = useState('Todos');
  const videosFiltrados = VIDEOS.filter(v => tagAtiva === 'Todos' || v.tag === tagAtiva);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tags.map(t => (
          <button key={t} onClick={() => setTagAtiva(t)}
            className={clsx('text-xs px-3 py-1.5 rounded-full border transition-all',
              tagAtiva === t ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
            )}>{t}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videosFiltrados.map((v, i) => (
          <motion.div key={v.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-sm hover:border-white/25 transition-all group cursor-pointer"
          >
            {playing === v.id ? (
              <div className="relative" style={{ paddingTop: '56.25%' }}>
                <iframe className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              </div>
            ) : (
              <div className="relative" style={{ paddingTop: '56.25%' }} onClick={() => setPlaying(v.id)}>
                <img src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`} alt={v.titulo}
                  className="absolute inset-0 w-full h-full object-cover" />
                <div className={clsx('absolute inset-0 bg-gradient-to-t opacity-60', v.cor)} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div whileHover={{ scale: 1.15 }}
                    className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl">
                    <Play size={18} className="text-white ml-0.5" fill="white" />
                  </motion.div>
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">{v.duracao}</div>
                <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">{v.tag}</div>
              </div>
            )}
            <div className="p-3.5">
              <p className="font-bold text-white text-sm leading-tight">{v.titulo}</p>
              <p className="text-xs text-slate-400 mt-0.5">{v.canal}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{v.descricao}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- Quiz Tab ----------------------------------------------------------------

const QUIZ_TEMPO = 20;

function QuizTab({ progress, onQuizCompleto }: {
  progress: UserProgress | null;
  onQuizCompleto: (catId: string, acertos: number, total: number, xp: number) => void;
}) {
  const [catSel, setCatSel]     = useState<string | null>(null);
  const [qIdx, setQIdx]         = useState(0);
  const [selecionada, setSel]   = useState<number | null>(null);
  const [acertos, setAcertos]   = useState<boolean[]>([]);
  const [finalizado, setFin]    = useState(false);
  const [tempo, setTempo]       = useState(QUIZ_TEMPO);
  const [shake, setShake]       = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [ranking, setRanking]   = useState<RankingEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cat      = QUIZ_CATEGORIAS.find(c => c.id === catSel);
  const pergunta = cat?.perguntas[qIdx];
  const totalAcertos = acertos.filter(Boolean).length;
  const xpGanho = totalAcertos * 75 + (tempo > 10 ? 25 : 0);

  useEffect(() => {
    if (!catSel || selecionada !== null || finalizado) return;
    setTempo(QUIZ_TEMPO);
    timerRef.current = setInterval(() => {
      setTempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setSel(-1);
          setAcertos(p => [...p, false]);
          setShake(true);
          setTimeout(() => setShake(false), 600);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [catSel, qIdx, selecionada, finalizado]);

  function responder(i: number) {
    if (selecionada !== null || !pergunta) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSel(i);
    const correto = i === pergunta.c;
    setAcertos(p => [...p, correto]);
    if (correto) { setConfetti(true); setTimeout(() => setConfetti(false), 1500); }
    else { setShake(true); setTimeout(() => setShake(false), 600); }
  }

  function proxima() {
    if (!cat) return;
    if (qIdx + 1 >= cat.perguntas.length) {
      setFin(true);
      onQuizCompleto(catSel!, totalAcertos, cat.perguntas.length, xpGanho);
      setLoadingRanking(true);
      carregarRanking().then(r => { setRanking(r); setLoadingRanking(false); });
    } else {
      setQIdx(qIdx + 1); setSel(null); setConfetti(false);
    }
  }

  function reiniciar() {
    setCatSel(null); setQIdx(0); setSel(null); setAcertos([]); setFin(false);
    setConfetti(false); setShake(false);
  }

  if (!catSel) return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Escolha uma categoria. Cada pergunta tem {QUIZ_TEMPO} segundos!</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {QUIZ_CATEGORIAS.map((c, i) => {
          const Icon = c.icon;
          const completou = progress?.quizzesCompletos.some(q => q.catId === c.id) ?? false;
          return (
            <motion.button key={c.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setCatSel(c.id)}
              className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 transition-all text-left group relative"
            >
              {completou && <div className="absolute top-3 right-3"><CheckCircle size={14} className="text-emerald-400" /></div>}
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br', c.cor)}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{c.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.perguntas.length} perguntas • {QUIZ_TEMPO}s cada</p>
                {completou && <p className="text-[10px] text-emerald-400 mt-0.5">Completado!</p>}
              </div>
              <ChevronRight size={16} className="text-slate-500 ml-auto group-hover:translate-x-1 transition-transform" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  if (finalizado && cat) {
    const pct = Math.round((totalAcertos / cat.perguntas.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
        <GlassCard className="p-8 text-center space-y-5 relative overflow-hidden">
          <Confetti active={pct >= 60} />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/40">
            <Trophy size={36} className="text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white">{totalAcertos}/{cat.perguntas.length}</h3>
            <p className="text-slate-400 text-sm mt-1">
              {pct >= 80 ? 'Expert em sustentabilidade!' : pct >= 60 ? 'Bom trabalho!' : 'Continue aprendendo!'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 py-2.5 px-6 bg-emerald-600/20 border border-emerald-600/30 rounded-2xl">
            <Award size={18} className="text-emerald-400" />
            <span className="text-emerald-300 font-bold">+{xpGanho} XP ganhos!</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Acertos', value: totalAcertos,                       color: 'text-emerald-400' },
              { label: 'Erros',   value: cat.perguntas.length - totalAcertos, color: 'text-red-400'    },
              { label: 'Score',   value: `${pct}%`,                           color: 'text-blue-400'   },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 bg-white/5 border border-white/10">
                <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setQIdx(0); setSel(null); setAcertos([]); setFin(false); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all">
              <RotateCcw size={14} /> Repetir
            </button>
            <button onClick={reiniciar}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all">
              Categorias <ArrowRight size={14} />
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-yellow-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ranking Global</p>
          </div>
          {loadingRanking ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Carregando ranking...
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-slate-500 text-sm">Seja o primeiro no ranking!</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => {
                const medals = ['🥇','🥈','🥉'];
                const isMe = r.uid === auth.currentUser?.uid;
                return (
                  <div key={r.uid} className={clsx(
                    'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                    isMe ? 'bg-emerald-600/15 border border-emerald-600/30' : 'hover:bg-white/5'
                  )}>
                    <span className="text-base w-6 text-center">{medals[i] ?? `#${i+1}`}</span>
                    <span className={clsx('text-sm flex-1', isMe ? 'text-emerald-300 font-bold' : 'text-slate-300')}>
                      {r.nome}{isMe ? ' (voce)' : ''}
                    </span>
                    <span className="text-xs font-bold text-amber-400">{r.xp} XP</span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </motion.div>
    );
  }

  if (!cat || !pergunta) return null;
  const tempoPct = (tempo / QUIZ_TEMPO) * 100;
  const tempoColor = tempo > 10 ? '#22c55e' : tempo > 5 ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { setCatSel(null); setQIdx(0); setSel(null); setAcertos([]); if (timerRef.current) clearInterval(timerRef.current); }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ChevronRight size={12} className="rotate-180" /> Categorias
        </button>
        <div className="flex items-center gap-2">
          <Timer size={13} style={{ color: tempoColor }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: tempoColor }}>{tempo}s</span>
        </div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: tempoColor }}
          animate={{ width: `${tempoPct}%` }} transition={{ duration: 0.9, ease: 'linear' }} />
      </div>

      <div className="flex gap-1.5">
        {cat.perguntas.map((_, i) => (
          <div key={i} className={clsx('h-1.5 flex-1 rounded-full transition-all',
            i < acertos.length ? (acertos[i] ? 'bg-emerald-400' : 'bg-red-400')
              : i === qIdx ? 'bg-emerald-600' : 'bg-white/10'
          )} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={qIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0, rotate: shake ? [0, -2, 2, -2, 0] : 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <GlassCard className="p-5 space-y-4 relative overflow-hidden">
            <Confetti active={confetti} />
            <h3 className="font-bold text-white text-base leading-relaxed">{pergunta.p}</h3>
            <div className="space-y-2">
              {pergunta.ops.map((op, i) => {
                const resp = selecionada !== null;
                const isC  = i === pergunta.c;
                const isSel = i === selecionada;
                return (
                  <motion.button key={i} onClick={() => responder(i)} disabled={resp}
                    whileHover={!resp ? { scale: 1.01, x: 3 } : undefined}
                    whileTap={!resp ? { scale: 0.98 } : undefined}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3',
                      !resp && 'hover:border-emerald-500/60 hover:bg-emerald-600/10 cursor-pointer',
                      resp && isC  && 'bg-emerald-600/20 border-emerald-500 text-emerald-200',
                      resp && isSel && !isC && 'bg-red-600/20 border-red-500 text-red-200',
                      (!resp || (!isC && !isSel)) && 'bg-white/5 border-white/10 text-slate-300',
                    )}
                  >
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                      resp && isC ? 'bg-emerald-500 text-white scale-110'
                        : resp && isSel && !isC ? 'bg-red-500 text-white'
                        : 'bg-white/10 text-slate-400'
                    )}>
                      {resp ? (isC ? <CheckCircle size={12}/> : isSel ? <XCircle size={12}/> : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                    </span>
                    {op}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selecionada !== null && (
                <motion.div initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                  className={clsx('rounded-xl p-4 border text-xs leading-relaxed overflow-hidden',
                    acertos[acertos.length-1]
                      ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-200'
                      : 'bg-slate-700/40 border-white/10 text-slate-300'
                  )}
                >
                  <p className="font-bold mb-1.5 flex items-center gap-1.5">
                    {acertos[acertos.length-1] ? <><CheckCircle size={12}/> Correto!</> : <><XCircle size={12}/> Incorreto</>}
                  </p>
                  {pergunta.exp}
                </motion.div>
              )}
            </AnimatePresence>

            {selecionada !== null && (
              <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={proxima}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
              >
                {qIdx + 1 >= cat.perguntas.length ? <><Trophy size={14}/> Ver resultado</> : <>Proxima <ArrowRight size={14}/></>}
              </motion.button>
            )}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Carbon Tab --------------------------------------------------------------

function CarbonTab() {
  const meses6 = Array.from({length:6},(_,i)=>{
    const d = new Date(); d.setMonth(d.getMonth()-i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [mesSel, setMesSel]       = useState(meses6[0]);
  const [loading, setLoading]     = useState(false);
  const [carbono, setCarbono]     = useState<ReturnType<typeof calcularCarbono>|null>(null);
  const [historico, setHistorico] = useState<{label:string;kg:number}[]>([]);
  const [dicaIA, setDicaIA]       = useState('');
  const [loadingIA, setLoadingIA] = useState(false);

  async function calcular() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true); setCarbono(null); setDicaIA(''); setHistorico([]);
    try {
      const snap = await getDocs(query(collection(db,'registros'),where('uid','==',uid),where('mes','==',mesSel)));
      const regs = snap.docs.map(d=>d.data() as Registro);
      const res  = calcularCarbono(regs);
      const e = regs.filter(r=>r.categoria==='energia').reduce((s,r)=>s+r.valor,0);
      const a = regs.filter(r=>r.categoria==='agua').reduce((s,r)=>s+r.valor,0);
      const o = regs.filter(r=>r.categoria==='outro').reduce((s,r)=>s+r.valor,0);
      setCarbono(res);

      const hist = await Promise.all(meses6.slice().reverse().map(async m=>{
        const s = await getDocs(query(collection(db,'registros'),where('uid','==',uid),where('mes','==',m)));
        const rs = s.docs.map(d=>d.data() as Registro);
        const kg = rs.reduce((acc,r)=>acc+r.valor*CARBON_FACTORS[r.categoria],0);
        return { label: getMesLabel(m,true), kg: +kg.toFixed(1) };
      }));
      setHistorico(hist);

      setLoadingIA(true);
      const dica = await gerarDicaIA(e,a,o,res.totalKg);
      setDicaIA(dica);
    } finally { setLoading(false); setLoadingIA(false); }
  }

  const nivel = carbono
    ? carbono.totalKg < 50
      ? { label:'Baixo', color:'text-emerald-400', bg:'bg-emerald-600/20 border-emerald-600/30', bar:'bg-emerald-500' }
      : carbono.totalKg < 120
        ? { label:'Medio', color:'text-yellow-400', bg:'bg-yellow-600/20 border-yellow-600/30', bar:'bg-yellow-500' }
        : { label:'Alto', color:'text-red-400', bg:'bg-red-600/20 border-red-600/30', bar:'bg-red-500' }
    : null;

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Mes de referencia</label>
          <select value={mesSel} onChange={e=>{setMesSel(e.target.value);setCarbono(null);setDicaIA('');}}
            className="bg-white/10 border border-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl outline-none">
            {meses6.map(m=><option key={m} value={m} className="bg-slate-800">{getMesLabel(m)}</option>)}
          </select>
        </div>
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={calcular} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30"
        >
          {loading ? <Loader2 size={15} className="animate-spin"/> : <Calculator size={15}/>}
          {loading ? 'Calculando...' : 'Calcular pegada'}
        </motion.button>
      </GlassCard>

      {!carbono && !loading && (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Wind size={28} className="text-emerald-500"/>
          </div>
          <div>
            <p className="font-bold text-white">Calcule sua pegada de carbono</p>
            <p className="text-sm mt-1 text-slate-400">Selecione um mes e clique em <span className="text-emerald-400">Calcular pegada</span>.</p>
          </div>
        </GlassCard>
      )}

      <AnimatePresence>
        {carbono && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
            <GlassCard className="p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 to-transparent pointer-events-none"/>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Pegada de Carbono — {getMesLabel(mesSel)}</p>
              <div className="flex items-end justify-center gap-2 mb-3">
                <motion.span initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200}}
                  className="text-6xl font-black text-white">
                  {carbono.totalKg.toFixed(1)}
                </motion.span>
                <span className="text-xl text-slate-400 pb-2">kg CO2</span>
              </div>
              {nivel && (
                <>
                  <span className={clsx('inline-block text-sm font-bold px-4 py-1 rounded-full border mb-3', nivel.bg, nivel.color)}>
                    Nivel {nivel.label}
                  </span>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                    <motion.div initial={{width:0}} animate={{width:`${Math.min((carbono.totalKg/167)*100,100)}%`}}
                      transition={{duration:1.2,ease:'easeOut'}}
                      className={clsx('h-full rounded-full', nivel.bar)}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Meta sustentavel: menos de 167 kg CO2/mes (2t/ano)</p>
                </>
              )}
            </GlassCard>

            <div className="grid grid-cols-3 gap-3">
              {[
                {label:'Energia', kg:carbono.energiaKg, icon:Zap,     cor:'from-amber-500 to-yellow-500'},
                {label:'Agua',    kg:carbono.aguaKg,    icon:Droplets, cor:'from-blue-500 to-cyan-500'},
                {label:'Outros',  kg:carbono.outroKg,   icon:Wind,     cor:'from-violet-500 to-indigo-500'},
              ].map(c=>(
                <motion.div key={c.label} whileHover={{scale:1.04}}>
                  <GlassCard className="p-4 text-center">
                    <div className={clsx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-2', c.cor)}>
                      <c.icon size={16} className="text-white"/>
                    </div>
                    <p className="text-xl font-black text-white">{c.kg.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500">kg CO2</p>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{c.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {historico.length > 0 && (
              <GlassCard className="p-5 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium flex items-center gap-2">
                  <BarChart3 size={12}/> Evolucao — ultimos 6 meses (kg CO2)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={historico} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="label" tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{background:'#1e293b',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:11}}
                      labelStyle={{color:'#94a3b8'}} itemStyle={{color:'#e2e8f0'}}
                      formatter={(v:any)=>[`${v} kg CO2`]}
                    />
                    <Bar dataKey="kg" radius={[6,6,0,0]}>
                      {historico.map((entry,i)=>(
                        <Cell key={i} fill={entry.label===getMesLabel(mesSel,true)?'#22c55e':'#334155'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            )}

            <GlassCard className="p-5 space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Isso equivale a...</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {emoji:'🌳', label:`${carbono.arvoresTotais} arvore${carbono.arvoresTotais!==1?'s':''}`, sub:'para absorver em 1 ano'},
                  {emoji:'🚗', label:`${carbono.kmCarro.toLocaleString('pt-BR')} km`, sub:'rodados de carro'},
                  {emoji:'✈️', label:`${carbono.horasAviao}h de voo`, sub:'em altitude de cruzeiro'},
                ].map((eq,i)=>(
                  <motion.div key={i} whileHover={{scale:1.03}} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-2xl">{eq.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{eq.label}</p>
                      <p className="text-[10px] text-slate-500">{eq.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5 space-y-3 border-emerald-500/20 bg-emerald-600/5">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-400"/>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Analise Personalizada — IA</p>
              </div>
              {loadingIA ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin text-emerald-400"/> Analisando seus dados...
                </div>
              ) : dicaIA ? (
                <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-sm text-emerald-200 leading-relaxed">{dicaIA}</motion.p>
              ) : null}
            </GlassCard>

            <GlassCard className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acoes de Alto Impacto</p>
              <div className="space-y-2">
                {[
                  {acao:'Comer menos carne bovina (2x/semana menos)', reducao:'-6 kg CO2/mes', emoji:'🥗'},
                  {acao:'Usar transporte publico 3x por semana',       reducao:'-4 kg CO2/mes', emoji:'🚌'},
                  {acao:'Trocar todas as lampadas por LED',            reducao:'-2 kg CO2/mes', emoji:'💡'},
                  {acao:'Reduzir 5 min no banho diario',               reducao:'-1,5 kg CO2/mes', emoji:'🚿'},
                  {acao:'Desligar stand-by dos aparelhos',             reducao:'-0,8 kg CO2/mes', emoji:'🔌'},
                ].map((a,i)=>(
                  <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.07}}
                    whileHover={{x:4}}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{a.emoji}</span>
                      <p className="text-xs text-slate-300">{a.acao}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{a.reducao}</span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main Page ---------------------------------------------------------------

export default function EducationPage() {
  const { darkMode } = useTheme();
  const [tab, setTab]             = useState<'artigos'|'videos'|'quiz'|'carbono'>('artigos');
  const [progress, setProgress]   = useState<UserProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const uid      = auth.currentUser?.uid;
  const userName = auth.currentUser?.displayName ?? auth.currentUser?.email?.split('@')[0] ?? 'Usuario';

  useEffect(() => {
    if (!uid) { setLoadingProgress(false); return; }
    carregarProgresso(uid).then(p => { setProgress(p); setLoadingProgress(false); });
  }, [uid]);

  async function handleArtigoLido(id: string) {
    if (!uid) return;
    await salvarArtigoLido(uid, id);
    setProgress(p => p ? { ...p, artigosLidos: [...p.artigosLidos, id], xpEducacao: p.xpEducacao + 50 } : p);
  }

  async function handleQuizCompleto(catId: string, acertos: number, total: number, xp: number) {
    if (!uid) return;
    await salvarQuizCompleto(uid, catId, acertos, total, xp, userName);
    setProgress(p => p ? {
      ...p,
      quizzesCompletos: [...p.quizzesCompletos, { catId, acertos, total, data: new Date() }],
      xpEducacao: p.xpEducacao + xp,
    } : p);
  }

  async function handleAceitarDesafio(desafio: typeof DESAFIOS_SEMANA[0]) {
    if (!uid) return;
    await salvarDesafioAceito(uid, desafio.id, desafio.xp, userName);
    setProgress(p => p ? {
      ...p,
      desafiosAceitos: [...p.desafiosAceitos, desafio.id],
      xpEducacao: p.xpEducacao + desafio.xp,
    } : p);
  }

  const artigosLidos  = progress?.artigosLidos.length  ?? 0;
  const quizCompletos = progress?.quizzesCompletos.length ?? 0;
  const xpEducacao    = progress?.xpEducacao ?? 0;

  const TABS = [
    { id: 'artigos', label: 'Noticias',  icon: BookOpen, badge: artigosLidos  },
    { id: 'videos',  label: 'Videos',    icon: Play,     badge: 0             },
    { id: 'quiz',    label: 'Quiz',      icon: Brain,    badge: quizCompletos },
    { id: 'carbono', label: 'Carbono',   icon: Wind,     badge: 0             },
  ] as const;

  return (
    <div className={clsx('min-h-screen p-6 space-y-6', darkMode ? 'bg-slate-900' : 'bg-slate-50')}>
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-600/6 rounded-full blur-3xl"/>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-600/5 rounded-full blur-3xl"/>
        </div>
      )}

      {/* Header */}
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-900/40">
            <BookOpen size={22} className="text-white"/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-black', darkMode ? 'text-white' : 'text-slate-900')}>
              Educacao Ambiental
            </h1>
            <p className={clsx('text-sm', darkMode ? 'text-slate-400' : 'text-slate-500')}>
              Noticias, videos, quiz e calculadora de carbono
            </p>
          </div>
        </div>
        {!loadingProgress && (
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30"
          >
            <Flame size={14} className="text-emerald-400"/>
            <span className="text-emerald-300 font-bold text-sm">{xpEducacao} XP</span>
          </motion.div>
        )}
      </motion.div>

      {/* Daily Challenge */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.05}}>
        <DesafioCard progress={progress} onAceitarDesafio={handleAceitarDesafio}/>
      </motion.div>

      {/* Progress */}
      {!loadingProgress && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}
          className={clsx('rounded-2xl border p-4 flex items-center gap-4', darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm')}
        >
          <div className="flex gap-4 flex-wrap">
            {[
              {label:'Noticias lidas', value:`${artigosLidos}/${NOTICIAS_CATEGORIAS.length}`, icon:BookOpen, color:'text-blue-400'},
              {label:'Quizzes',        value:`${quizCompletos}/${QUIZ_CATEGORIAS.length}`,    icon:Brain,    color:'text-violet-400'},
              {label:'Desafios',       value:`${progress?.desafiosAceitos.length??0}/7`,      icon:Bolt,     color:'text-amber-400'},
            ].map(s=>(
              <div key={s.label} className="flex items-center gap-2">
                <s.icon size={13} className={s.color}/>
                <span className={clsx('text-xs font-bold', s.color)}>{s.value}</span>
                <span className={clsx('text-xs', darkMode?'text-slate-500':'text-slate-400')}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className={clsx('h-1.5 rounded-full', darkMode?'bg-white/10':'bg-slate-200')}>
              <motion.div
                initial={{width:0}}
                animate={{width:`${Math.round(((artigosLidos+quizCompletos)/(NOTICIAS_CATEGORIAS.length+QUIZ_CATEGORIAS.length))*100)}%`}}
                transition={{duration:1,ease:'easeOut'}}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>
            <p className={clsx('text-[10px] mt-1', darkMode?'text-slate-500':'text-slate-400')}>Progresso geral</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.1}}
        className={clsx('flex gap-1 p-1.5 rounded-2xl overflow-x-auto border backdrop-blur-sm',
          darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        {TABS.map(t => (
          <TabBtn key={t.id} id={t.id} label={t.label} icon={t.icon} active={tab===t.id} onClick={()=>setTab(t.id)} badge={t.badge} />
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
          transition={{duration:0.2}}
        >
          {tab === 'artigos' && <ArtigosTab progress={progress} onArtigoLido={handleArtigoLido}/>}
          {tab === 'videos'  && <VideosTab/>}
          {tab === 'quiz'    && <QuizTab progress={progress} onQuizCompleto={handleQuizCompleto}/>}
          {tab === 'carbono' && <CarbonTab/>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}