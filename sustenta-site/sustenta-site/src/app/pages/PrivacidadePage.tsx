import React, { useState } from 'react';
import { Leaf, ArrowLeft, Shield, Database, Lock, Eye, Share2, Trash2, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface PrivacidadePageProps {
  onVoltar: () => void;
}

const secoes = [
  {
    icon: Database,
    cor: 'text-blue-600 bg-blue-50',
    titulo: '1. Dados que coletamos',
    conteudo: `Coletamos apenas os dados necessários para oferecer a melhor experiência no Sustenta:

• Dados de cadastro: nome completo, endereço de e-mail, número de telefone (opcional), estado e cidade de residência.

• Dados de consumo: registros de energia elétrica, água, transporte e outros gastos que você insere voluntariamente na plataforma.

• Dados de uso: informações sobre como você interage com o aplicativo, páginas visitadas, funcionalidades utilizadas e tempo de sessão, coletados de forma anônima para melhorar a plataforma.

• Dados de autenticação: tokens de sessão gerados pelo Firebase Authentication para manter sua conta segura.

• Dados educacionais: progresso em quizzes, desafios concluídos, artigos lidos e pontuação no ranking de educação ambiental.

Não coletamos dados de localização em tempo real, informações financeiras como cartões ou dados bancários, nem qualquer dado sensível sem seu consentimento explícito.`,
  },
  {
    icon: Eye,
    cor: 'text-emerald-600 bg-emerald-50',
    titulo: '2. Como usamos seus dados',
    conteudo: `Seus dados são utilizados exclusivamente para:

• Personalizar seu painel com análises e insights sobre seu consumo ambiental.

• Calcular seu score de sustentabilidade e seu progresso no sistema de XP e níveis.

• Enviar notificações relevantes sobre seus gastos, conquistas e lembretes de registro.

• Gerar relatórios comparativos entre meses e entre membros do seu grupo familiar.

• Melhorar continuamente os algoritmos de análise e as recomendações da plataforma.

• Cumprir obrigações legais quando exigido por autoridades competentes.

Nunca usamos seus dados para fins publicitários de terceiros. O Sustenta não vende, aluga ou comercializa suas informações pessoais.`,
  },
  {
    icon: Share2,
    cor: 'text-purple-600 bg-purple-50',
    titulo: '3. Compartilhamento de dados',
    conteudo: `Seus dados pessoais não são compartilhados com terceiros, exceto nas seguintes situações:

• Prestadores de serviço essenciais: utilizamos o Firebase (Google) para autenticação e armazenamento de dados, a NewsAPI para conteúdo de notícias (apenas dados anônimos de consulta) e a Google Maps API para funcionalidades de mapa.

• Grupo familiar: se você criar ou participar de um grupo familiar no Sustenta, membros do grupo poderão ver seu consumo agregado por categoria. Nenhum dado pessoal de identificação é compartilhado sem sua autorização.

• Obrigações legais: podemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade governamental competente.

• Ranking público: seu nome e pontuação de XP podem aparecer no ranking global de educação ambiental. Você pode optar por não participar nas configurações do perfil.

Todos os nossos parceiros de tecnologia seguem políticas de privacidade compatíveis com a LGPD.`,
  },
  {
    icon: Lock,
    cor: 'text-amber-600 bg-amber-50',
    titulo: '4. Segurança dos dados',
    conteudo: `Adotamos as melhores práticas de segurança para proteger suas informações:

• Criptografia em trânsito: toda comunicação entre seu dispositivo e nossos servidores utiliza protocolo HTTPS/TLS.

• Criptografia em repouso: seus dados armazenados no Firestore são criptografados pela infraestrutura do Google Cloud.

• Autenticação segura: senhas nunca são armazenadas em texto puro. Utilizamos o Firebase Authentication, que gerencia credenciais com padrões de segurança de nível empresarial.

• Regras de acesso: cada usuário só pode acessar seus próprios dados. As regras do Firestore garantem isolamento total entre contas.

• Monitoramento: nossa infraestrutura conta com monitoramento contínuo para detectar e responder a incidentes de segurança.

Em caso de violação de dados que possa afetar seus direitos, notificaremos você e a ANPD dentro do prazo legal de 72 horas.`,
  },
  {
    icon: Shield,
    cor: 'text-teal-600 bg-teal-50',
    titulo: '5. Seus direitos (LGPD)',
    conteudo: `Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem os seguintes direitos:

• Acesso: solicitar uma cópia completa de todos os dados que temos sobre você.

• Correção: corrigir dados incompletos, inexatos ou desatualizados diretamente nas configurações do perfil.

• Anonimização ou bloqueio: solicitar a anonimização ou bloqueio de dados desnecessários ou excessivos.

• Eliminação: solicitar a exclusão de seus dados pessoais tratados com base em seu consentimento.

• Portabilidade: receber seus dados em formato estruturado e de uso comum (CSV ou JSON).

• Revogação de consentimento: retirar seu consentimento a qualquer momento, sem prejuízo ao tratamento realizado anteriormente.

• Oposição: opor-se ao tratamento realizado com fundamentos distintos do consentimento.

Para exercer qualquer um desses direitos, entre em contato pelo e-mail: privacidade@sustenta.app`,
  },
  {
    icon: Trash2,
    cor: 'text-red-600 bg-red-50',
    titulo: '6. Retenção e exclusão de dados',
    conteudo: `Mantemos seus dados pelo tempo necessário para prestar os serviços contratados ou enquanto sua conta estiver ativa.

• Dados de consumo e perfil: mantidos enquanto sua conta existir ou até você solicitar exclusão.

• Dados de sessão e logs: retidos por até 90 dias para fins de segurança e diagnóstico.

• Dados de ranking: mantidos enquanto você participar do ranking. Ao sair, sua pontuação é removida.

Ao solicitar a exclusão da conta, todos os seus dados pessoais serão permanentemente removidos de nossos sistemas em até 30 dias, exceto quando houver obrigação legal de retenção.

Para solicitar a exclusão da sua conta e dados, acesse Perfil > Ajustes > Excluir Conta, ou envie um e-mail para privacidade@sustenta.app.`,
  },
];

export const PrivacidadePage: React.FC<PrivacidadePageProps> = ({ onVoltar }) => {
  const [aberta, setAberta] = useState<number | null>(0);

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
      <section className="bg-blue-600 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4">Política de Privacidade</h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-xl mx-auto">
            Sua privacidade é nossa prioridade. Aqui você encontra tudo sobre como coletamos, usamos e protegemos seus dados.
          </p>
          <p className="text-blue-200 text-sm mt-6">Última atualização: janeiro de 2026</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">

        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <p className="text-blue-800 text-sm leading-relaxed">
            Esta Política de Privacidade descreve como o <strong>Sustenta</strong> coleta, usa, armazena e protege suas informações pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>. Ao utilizar nossa plataforma, você concorda com as práticas descritas neste documento.
          </p>
        </div>

        {/* Acordeao */}
        <div className="space-y-3">
          {secoes.map((secao, i) => {
            const Icon = secao.icon;
            const estaAberta = aberta === i;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setAberta(estaAberta ? null : i)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`shrink-0 p-2.5 rounded-xl ${secao.cor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 font-bold text-slate-900 text-sm">{secao.titulo}</span>
                  {estaAberta
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </button>
                {estaAberta && (
                  <div className="px-5 pb-5 border-t border-slate-50">
                    <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line pt-4">
                      {secao.conteudo}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contato DPO */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white text-center">
          <Mail className="w-8 h-8 text-slate-400 mx-auto mb-4" />
          <h3 className="font-black text-lg mb-2">Encarregado de Dados (DPO)</h3>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Para dúvidas, solicitações ou reclamações sobre privacidade e proteção de dados, entre em contato com nosso Encarregado de Dados:
          </p>
          <a href="mailto:privacidade@sustenta.app" className="text-emerald-400 font-semibold hover:underline">
            privacidade@sustenta.app
          </a>
          <p className="text-slate-500 text-xs mt-4">
            Respondemos em até 15 dias úteis, conforme exigido pela LGPD.
          </p>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 Sustenta — Gestão Inteligente de Consumo e Sustentabilidade</p>
      </footer>
    </div>
  );
};