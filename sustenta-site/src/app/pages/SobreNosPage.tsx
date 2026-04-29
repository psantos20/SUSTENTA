import React from 'react';
import { Leaf, ArrowLeft, Target, Eye, Heart, Users, TrendingDown, Award } from 'lucide-react';

interface SobreNosPageProps {
  onVoltar: () => void;
}

export const SobreNosPage: React.FC<SobreNosPageProps> = ({ onVoltar }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={onVoltar}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Leaf className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">Sustenta</span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-emerald-600 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4">Sobre o Sustenta</h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-xl mx-auto">
            Nascemos da convicção de que pequenas mudanças de hábito, multiplicadas por milhões de pessoas, podem transformar o planeta.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        {/* Nossa historia */}
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Nossa História</h2>
          <div className="prose prose-slate max-w-none space-y-4 text-slate-600 leading-relaxed">
            <p>
              O Sustenta nasceu em 2025 a partir de uma pergunta simples: <strong className="text-slate-800">por que é tão difícil saber quanto realmente consumimos?</strong> Energia, água, transporte, alimentação — tudo impacta o meio ambiente, mas raramente temos visibilidade clara sobre esses dados.
            </p>
            <p>
              Fundada por um grupo de engenheiros e entusiastas da sustentabilidade, a plataforma foi criada para democratizar o acesso à inteligência ambiental. Acreditamos que informação é o primeiro passo para a mudança.
            </p>
            <p>
              Hoje, o Sustenta ajuda milhares de famílias e indivíduos a monitorar, entender e reduzir seu impacto ambiental de forma simples, gamificada e motivadora.
            </p>
          </div>
        </section>

        {/* Missao, visao, valores */}
        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              cor: 'bg-emerald-50 text-emerald-600',
              titulo: 'Missão',
              texto: 'Empoderar pessoas com dados e ferramentas para reduzir seu impacto ambiental e construir hábitos mais sustentáveis no dia a dia.',
            },
            {
              icon: Eye,
              cor: 'bg-blue-50 text-blue-600',
              titulo: 'Visão',
              texto: 'Ser a plataforma de referência em gestão de consumo sustentável no Brasil, conectando indivíduos, famílias e comunidades em torno de um propósito comum.',
            },
            {
              icon: Heart,
              cor: 'bg-rose-50 text-rose-600',
              titulo: 'Valores',
              texto: 'Transparência, educação ambiental, inclusão digital e responsabilidade com as futuras gerações guiam cada decisão que tomamos.',
            },
          ].map(({ icon: Icon, cor, titulo, texto }) => (
            <div key={titulo} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className={`inline-flex p-3 rounded-xl ${cor} mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{titulo}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{texto}</p>
            </div>
          ))}
        </section>

        {/* O que fazemos */}
        <section>
          <h2 className="text-2xl font-black text-slate-900 mb-8">O que o Sustenta oferece</h2>
          <div className="space-y-4">
            {[
              {
                icon: TrendingDown,
                cor: 'text-emerald-600 bg-emerald-50',
                titulo: 'Monitoramento de Consumo',
                desc: 'Registre e acompanhe seus gastos de energia, água, transporte e outros recursos com dashboards intuitivos e gráficos em tempo real.',
              },
              {
                icon: Award,
                cor: 'text-amber-600 bg-amber-50',
                titulo: 'Sistema de XP e Níveis',
                desc: 'Ganhe pontos de experiência ao registrar consumo, completar quizzes, aceitar desafios e evoluir de Iniciante até Eco Herói.',
              },
              {
                icon: Users,
                cor: 'text-purple-600 bg-purple-50',
                titulo: 'Grupos Familiares',
                desc: 'Conecte-se com sua família, compare consumos, estabeleçam metas coletivas e tornem a sustentabilidade um projeto de todos.',
              },
              {
                icon: Leaf,
                cor: 'text-teal-600 bg-teal-50',
                titulo: 'Educação Ambiental',
                desc: 'Acesse notícias atualizadas, vídeos, quizzes e a calculadora de carbono com dicas personalizadas por inteligência artificial.',
              },
            ].map(({ icon: Icon, cor, titulo, desc }) => (
              <div key={titulo} className="flex gap-4 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className={`shrink-0 p-3 rounded-xl ${cor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

       

        {/* Contato */}
        <section className="text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-3">Fale conosco</h2>
          <p className="text-slate-500 mb-2">Dúvidas, sugestões ou parcerias? Estamos aqui.</p>
          <a href="mailto:contato@sustenta.app" className="text-emerald-600 font-semibold hover:underline">
            contato@sustenta.app
          </a>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 Sustenta — Gestão Inteligente de Consumo e Sustentabilidade</p>
      </footer>
    </div>
  );
};