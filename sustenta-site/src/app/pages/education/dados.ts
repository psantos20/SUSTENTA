import { Wind, Leaf, Zap, Droplets, Globe } from 'lucide-react';


export const PALAVRAS_SUSTENTABILIDADE = [
  'sustentabilidade', 'sustentavel', 'meio ambiente', 'ecologia', 'ecologico',
  'energia solar', 'energia renovavel', 'energia eolica', 'energia limpa',
  'biomassa', 'biocombustivel', 'hidrogenio verde',
  'reciclagem', 'reciclar', 'residuos', 'lixo eletronico', 'coleta seletiva',
  'desmatamento', 'reflorestamento', 'biodiversidade', 'conservacao ambiental',
  'aquecimento global', 'mudancas climaticas', 'mudanca climatica', 'emissao de carbono',
  'pegada de carbono', 'co2', 'gases de efeito estufa',
  'saneamento', 'crise hidrica', 'escassez de agua', 'desperdicio de agua',
  'ecoponto', 'economia circular', 'impacto ambiental',
  'ibama', 'inpe', 'amazonia', 'cerrado', 'mata atlantica', 'pantanal',
  'cop', 'acordo de paris', 'protocolo de kyoto',
  'carbon', 'esg', 'green', 'emisso', 'poluicao',
];


export const NOTICIAS_CATEGORIAS = [
  {
    id: 'sustentabilidade',
    label: 'Sustentabilidade',
    query: '"sustentabilidade" OR "meio ambiente" OR "impacto ambiental" OR "ecologia"',
    icon: Leaf,
    gradiente: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'energia',
    label: 'Energia',
    query: '"energia solar" OR "energia renovavel" OR "energia eolica" OR "energia limpa" OR "painel solar" OR "biocombustivel"',
    icon: Zap,
    gradiente: 'from-amber-500 to-yellow-500',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'agua',
    label: 'Agua',
    query: '"crise hidrica" OR "saneamento basico" OR "escassez de agua" OR "desperdicio de agua" OR "tratamento de esgoto"',
    icon: Droplets,
    gradiente: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'clima',
    label: 'Clima',
    query: '"mudancas climaticas" OR "aquecimento global" OR "desmatamento" OR "emissao de carbono" OR "gases de efeito estufa" OR "COP" OR "acordo de paris"',
    icon: Wind,
    gradiente: 'from-green-500 to-emerald-500',
    badge: 'bg-green-500/15 text-green-300 border-green-500/30',
  },
  {
    id: 'residuos',
    label: 'Residuos',
    query: '"reciclagem" OR "residuos solidos" OR "economia circular" OR "coleta seletiva" OR "lixo eletronico" OR "compostagem"',
    icon: Globe,
    gradiente: 'from-violet-500 to-indigo-500',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
];


export const VIDEOS = [
  { id: 'v1', titulo: 'A historia das coisas', canal: 'Story of Stuff Project', duracao: '21:16', youtubeId: 'gLBE5QAYXp8', descricao: 'O documentario que mudou a visao de consumo de milhoes de pessoas.', cor: 'from-emerald-600 to-teal-700', tag: 'Consumo' },
  { id: 'v2', titulo: 'Aquecimento global explicado', canal: 'Kurzgesagt', duracao: '8:32', youtubeId: 'wbR-5mHI6bo', descricao: 'Animacao cientifica premiada sobre mudancas climaticas.', cor: 'from-blue-600 to-indigo-700', tag: 'Clima' },
  { id: 'v3', titulo: 'Como funciona a energia solar', canal: 'Manual do Mundo', duracao: '12:05', youtubeId: 'RnvCbquYeIM', descricao: 'Tudo sobre paineis fotovoltaicos de forma didatica e pratica.', cor: 'from-yellow-600 to-orange-700', tag: 'Energia' },
  { id: 'v4', titulo: 'Crise da agua no Brasil', canal: 'Reporter Brasil', duracao: '14:22', youtubeId: 'f3F_GFMnMbA', descricao: 'Investigacao jornalistica sobre o futuro da agua no pais.', cor: 'from-cyan-600 to-blue-700', tag: 'Agua' },
  { id: 'v5', titulo: 'Compostagem em apartamento', canal: 'Horta em Casa', duracao: '9:44', youtubeId: 'bEAbxRpMfzU', descricao: 'Guia pratico para compostar em espacos pequenos.', cor: 'from-green-600 to-emerald-700', tag: 'Residuos' },
  { id: 'v6', titulo: 'Economia circular na pratica', canal: 'SEBRAE', duracao: '6:18', youtubeId: 'G4H1N_yXBiA', descricao: 'Casos reais de empresas brasileiras que eliminaram o lixo.', cor: 'from-violet-600 to-purple-700', tag: 'Economia' },
];


export const QUIZ_CATEGORIAS = [
  {
    id: 'energia',
    label: 'Energia',
    icon: Zap,
    cor: 'from-amber-500 to-yellow-500',
    perguntas: [
      { p: 'Qual aparelho consome mais energia em residencias?', ops: ['Televisao', 'Ar-condicionado', 'Computador', 'Roteador Wi-Fi'], c: 1, exp: 'O ar-condicionado consome entre 1.200 e 3.500W, enquanto uma TV LED moderna usa apenas 50-150W.' },
      { p: 'Quanto uma lampada LED economiza vs. incandescente?', ops: ['30-40%', '50-60%', '70-80%', '85-90%'], c: 2, exp: 'Uma LED de 10W produz a mesma luz que uma incandescente de 60W, economia de 83%.' },
      { p: 'Qual e o payback medio de energia solar residencial no Brasil?', ops: ['1-2 anos', '4-6 anos', '10-12 anos', '15-20 anos'], c: 1, exp: 'O payback medio e de 4-6 anos. Apos isso, a energia e gratuita por mais 15-20 anos.' },
    ],
  },
  {
    id: 'agua',
    label: 'Agua',
    icon: Droplets,
    cor: 'from-blue-500 to-cyan-500',
    perguntas: [
      { p: 'Qual % da agua doce planetaria esta em rios e lagos acessiveis?', ops: ['3%', '10%', '0,3%', '25%'], c: 2, exp: 'Apenas 0,3% esta em rios, lagos e reservatorios superficiais acessiveis.' },
      { p: 'Quantos litros/dia desperdiça um vazamento silencioso no vaso?', ops: ['5 litros', '40 litros', '100 litros', '200 litros'], c: 1, exp: 'Um vaso com vazamento silencioso desperdiça entre 30-100 litros por dia (media de 40L).' },
      { p: 'Qual atividade humana consome mais agua doce mundial?', ops: ['Uso domestico', 'Industria', 'Agricultura', 'Energia'], c: 2, exp: 'A agricultura consome 70% de toda a agua doce utilizada. A irrigacao e o principal uso.' },
    ],
  },
  {
    id: 'clima',
    label: 'Clima',
    icon: Globe,
    cor: 'from-emerald-500 to-teal-500',
    perguntas: [
      { p: 'Qual e a meta de temperatura do Acordo de Paris?', ops: ['Limitar a 1C', 'Limitar a 1,5-2C', 'Limitar a 3C', 'Estabilizar no nivel atual'], c: 1, exp: 'O Acordo de Paris (2015) busca limitar o aquecimento a 1,5C acima dos niveis pre-industriais.' },
      { p: 'Qual alimento tem maior pegada de carbono por kg?', ops: ['Frango', 'Porco', 'Carne bovina', 'Salmao'], c: 2, exp: 'A carne bovina emite 20-60 kg de CO2 por kg produzido. Frango emite apenas ~6 kg/kg.' },
      { p: 'Quantas arvores absorvem 1 tonelada de CO2 por ano?', ops: ['5 arvores', '10 arvores', '46 arvores', '100 arvores'], c: 2, exp: 'Uma arvore adulta absorve em media 21,7 kg de CO2 por ano. Para 1 tonelada sao necessarias ~46 arvores.' },
    ],
  },
  {
    id: 'biodiversidade',
    label: 'Biodiversidade',
    icon: Leaf,
    cor: 'from-violet-500 to-indigo-500',
    perguntas: [
      { p: 'Qual e a taxa atual de extincao de especies vs. natural?', ops: ['2x', '10x', '100x', '1.000x'], c: 3, exp: 'A taxa atual e estimada em 1.000 vezes mais rapida que a natural. Estamos na 6a extincao em massa.' },
      { p: 'Qual bioma brasileiro e mais biodiverso por km2?', ops: ['Amazonia', 'Cerrado', 'Mata Atlantica', 'Pantanal'], c: 2, exp: 'A Mata Atlantica e o bioma mais biodiverso por km2 do planeta, com mais de 20.000 especies de plantas.' },
      { p: 'Qual % das culturas alimentares sao polinizadas por abelhas?', ops: ['25%', '50%', '75%', '95%'], c: 2, exp: 'As abelhas polinizam cerca de 75% das especies de plantas que produzem alimentos para humanos.' },
    ],
  },
];


export const DESAFIOS_SEMANA = [
  { id: 'd0', emoji: '💡', titulo: 'Desafio do Dia: LED na Sala', descricao: 'Substitua hoje uma lampada incandescente por LED. Economia estimada: R$ 8/mes.', xp: 150, cor: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30', tag: 'Energia' },
  { id: 'd1', emoji: '🚿', titulo: 'Desafio do Dia: Banho de 5 Minutos', descricao: 'Cronometre seu banho hoje. 5 minutos = 45 litros economizados por banho.', xp: 100, cor: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', tag: 'Agua' },
  { id: 'd2', emoji: '🔌', titulo: 'Desafio do Dia: Zero Stand-by', descricao: 'Desligue todos os aparelhos da tomada ao dormir. Economia de ate 12% na conta.', xp: 120, cor: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/30', tag: 'Energia' },
  { id: 'd3', emoji: '🥗', titulo: 'Desafio do Dia: Refeicao Verde', descricao: 'Substitua uma refeicao com carne por uma vegetariana. Reduz ate 2 kg de CO2.', xp: 200, cor: 'from-green-500/20 to-emerald-500/10', border: 'border-green-500/30', tag: 'Clima' },
  { id: 'd4', emoji: '♻️', titulo: 'Desafio do Dia: Separar o Lixo', descricao: 'Separe corretamente o lixo hoje: organico, reciclavel e rejeito.', xp: 80, cor: 'from-teal-500/20 to-cyan-500/10', border: 'border-teal-500/30', tag: 'Residuos' },
  { id: 'd5', emoji: '🚌', titulo: 'Desafio do Dia: Transporte Sustentavel', descricao: 'Use transporte publico, bicicleta ou va a pe em um deslocamento hoje.', xp: 180, cor: 'from-indigo-500/20 to-blue-500/10', border: 'border-indigo-500/30', tag: 'Clima' },
  { id: 'd6', emoji: '🌱', titulo: 'Desafio do Dia: Plantar uma Semente', descricao: 'Plante uma semente ou mude hoje. Cada planta absorve CO2 e melhora o microclima.', xp: 150, cor: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', tag: 'Biodiversidade' },
];


/**
 * Fator de emissão da energia elétrica: média do Sistema Interligado Nacional
 * em 2023, 38,5 kg CO2/MWh = 0,0385 kg CO2/kWh (MCTI, divulgado em fev/2024).
 * Atenção: desde a atualização da base de cálculo em 2025 (inclusão de solar e
 * eólica) os valores mensais do MCTI ficaram menores (~0,02 a 0,03 kg/kWh).
 * Para atualizar, troque este número pelo valor do ano mais recente em
 * https://www.gov.br/mcti (SIRENE > fatores de emissão).
 */
export const FATOR_ENERGIA_KG_POR_KWH = 0.0385;

/**
 * ESTIMATIVAS por real gasto (kg CO2 por R$), usadas só quando o usuário NÃO
 * informou a quantidade (kWh/m³). São valores aproximados, sem fonte oficial:
 * a conta em R$ depende da tarifa de cada cidade. Água e "outros" ainda usam
 * sempre a estimativa (não há fator oficial adotado no projeto).
 */
export const CARBON_FACTORS = { energia: 0.083, agua: 0.021, outro: 0.045 };

export const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const MESES_FULL = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];


export const QUIZ_TEMPO = 20;
