import React, { useState } from 'react';
import { Leaf, ArrowLeft, FileText, UserCheck, Ban, AlertTriangle, Scale, RefreshCw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

interface TermosUsoPageProps {
  onVoltar: () => void;
}

const secoes = [
  {
    icon: UserCheck,
    cor: 'text-emerald-600 bg-emerald-50',
    titulo: '1. Aceitação dos Termos',
    conteudo: `Ao acessar ou utilizar a plataforma Sustenta, seja pelo aplicativo web, mobile ou qualquer outro meio disponibilizado, você declara que:

• Leu, compreendeu e concorda com estes Termos de Uso em sua totalidade.

• Tem capacidade legal para celebrar contratos, sendo maior de 16 anos ou, se menor, possui consentimento de pais ou responsáveis legais.

• As informações fornecidas no cadastro são verdadeiras, completas e atualizadas.

Se você não concordar com qualquer parte destes termos, deverá interromper imediatamente o uso da plataforma.

Estes Termos de Uso constituem um acordo legal vinculante entre você (Usuário) e o Sustenta. Em caso de dúvidas, entre em contato pelo e-mail: suporte@sustenta.app`,
  },
  {
    icon: CheckCircle,
    cor: 'text-blue-600 bg-blue-50',
    titulo: '2. Cadastro e Conta',
    conteudo: `Para utilizar as funcionalidades completas do Sustenta, é necessário criar uma conta. Ao fazê-lo:

• Responsabilidade pelas credenciais: você é inteiramente responsável pela segurança da sua senha e pelo sigilo dos seus dados de acesso. O Sustenta não se responsabiliza por acessos não autorizados decorrentes de negligência do usuário.

• Dados verdadeiros: você se compromete a fornecer informações verídicas e a mantê-las atualizadas. Contas com dados falsos poderão ser suspensas ou encerradas.

• Uma conta por pessoa: é vedada a criação de múltiplas contas para o mesmo usuário ou o compartilhamento de contas entre pessoas distintas.

• Notificação de violação: caso identifique acesso não autorizado à sua conta, você deve notificar imediatamente o Sustenta pelo e-mail suporte@sustenta.app.

• Exclusão de conta: você pode excluir sua conta a qualquer momento pelas configurações do perfil. A exclusão implica a remoção permanente dos seus dados.`,
  },
  {
    icon: FileText,
    cor: 'text-purple-600 bg-purple-50',
    titulo: '3. Uso da Plataforma',
    conteudo: `O Sustenta concede a você uma licença limitada, não exclusiva, intransferível e revogável para acessar e utilizar a plataforma para fins pessoais e não comerciais.

Você pode:
• Registrar e acompanhar seus dados de consumo pessoal e familiar.
• Participar de quizzes, desafios e rankings de educação ambiental.
• Gerar e exportar relatórios dos seus próprios dados.
• Compartilhar conquistas nas redes sociais, desde que de forma leal e sem distorções.
• Participar de grupos familiares com pessoas de sua confiança.

Você não pode:
• Utilizar a plataforma para fins comerciais sem autorização expressa e por escrito do Sustenta.
• Revender, sublicenciar ou transferir o acesso à plataforma a terceiros.
• Utilizar bots, scrapers ou qualquer meio automatizado para coletar dados da plataforma.
• Tentar acessar áreas restritas, dados de outros usuários ou sistemas internos.
• Reproduzir, distribuir ou criar obras derivadas com base no conteúdo proprietário do Sustenta.`,
  },
  {
    icon: Ban,
    cor: 'text-red-600 bg-red-50',
    titulo: '4. Condutas Proibidas',
    conteudo: `É expressamente proibido utilizar o Sustenta para:

• Inserir dados falsos com o objetivo de manipular rankings, scores ou comparativos.

• Praticar qualquer forma de fraude, engano ou conduta desonesta que prejudique outros usuários ou a integridade da plataforma.

• Publicar, transmitir ou compartilhar conteúdo ofensivo, difamatório, discriminatório, ilegal ou que viole direitos de terceiros.

• Tentar comprometer a segurança, disponibilidade ou integridade da plataforma por meio de ataques, injeção de código malicioso ou qualquer outra técnica.

• Coletar dados pessoais de outros usuários sem autorização.

• Violar qualquer lei ou regulamento aplicável, incluindo a LGPD, o Marco Civil da Internet (Lei 12.965/2014) e demais normas vigentes.

O descumprimento dessas regras poderá resultar na suspensão ou exclusão permanente da conta, sem prejuízo das medidas legais cabíveis.`,
  },
  {
    icon: AlertTriangle,
    cor: 'text-amber-600 bg-amber-50',
    titulo: '5. Limitação de Responsabilidade',
    conteudo: `O Sustenta é fornecido "no estado em que se encontra" (as is), sem garantias expressas ou implícitas de qualquer natureza.

Não nos responsabilizamos por:
• Decisões tomadas com base nas análises, scores ou recomendações geradas pela plataforma, que têm caráter informativo e não substituem assessoria profissional especializada.

• Interrupções temporárias de serviço decorrentes de manutenção programada, falhas de infraestrutura de terceiros (Google Firebase, APIs externas) ou casos fortuitos e de força maior.

• Perdas de dados decorrentes de falhas de hardware, corrupção de dados ou exclusão acidental por parte do usuário.

• Conteúdo de terceiros acessado por links ou integrações presentes na plataforma, como notícias da NewsAPI ou vídeos do YouTube.

• Imprecisões nos cálculos de carbono ou scores ambientais, que são estimativas baseadas em médias e referências científicas públicas.

Nossa responsabilidade total perante você, em qualquer hipótese, não excederá o valor eventualmente pago pela assinatura nos últimos 3 meses.`,
  },
  {
    icon: Scale,
    cor: 'text-teal-600 bg-teal-50',
    titulo: '6. Propriedade Intelectual',
    conteudo: `Todo o conteúdo e tecnologia presentes no Sustenta são protegidos por direitos de propriedade intelectual:

• Marca e identidade visual: o nome "Sustenta", o logotipo, as cores e a identidade visual são marcas registradas ou em processo de registro, protegidas pela legislação brasileira e internacional.

• Software e código: o código-fonte, a arquitetura e os algoritmos da plataforma são propriedade exclusiva do Sustenta e não podem ser copiados, modificados ou distribuídos.

• Conteúdo editorial: artigos, textos, descrições de desafios, perguntas de quizzes e demais conteúdos produzidos pelo Sustenta são protegidos por direito autoral.

• Dados do usuário: os dados que você insere na plataforma pertencem a você. O Sustenta possui licença limitada para processá-los conforme descrito na Política de Privacidade.

• Conteúdo de terceiros: notícias, vídeos e outros conteúdos de terceiros são exibidos com as devidas atribuições e sob as licenças aplicáveis de cada provedor.`,
  },
  {
    icon: RefreshCw,
    cor: 'text-slate-600 bg-slate-100',
    titulo: '7. Alterações e Vigência',
    conteudo: `Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento, mediante aviso prévio aos usuários:

• Notificação: alterações relevantes serão comunicadas por e-mail cadastrado e por notificação na plataforma com antecedência mínima de 15 dias.

• Aceitação tácita: a continuidade do uso da plataforma após a entrada em vigor das alterações constitui aceitação dos novos termos.

• Vigência: estes Termos entram em vigor na data de criação da sua conta e permanecem válidos até o encerramento da mesma.

• Lei aplicável: estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo - SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

• Integralidade: estes Termos de Uso, juntamente com a Política de Privacidade, constituem o acordo integral entre o Sustenta e o usuário, substituindo quaisquer acordos anteriores sobre o mesmo objeto.

Data de vigência: janeiro de 2026.`,
  },
];

export const TermosUsoPage: React.FC<TermosUsoPageProps> = ({ onVoltar }) => {
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
      <section className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4">Termos de Uso</h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto">
            Leia com atenção as condições que regem o uso da plataforma Sustenta. Ao criar sua conta, você concorda com estes termos.
          </p>
          <p className="text-slate-500 text-sm mt-6">Última atualização: janeiro de 2026</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">

        {/* Intro */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm leading-relaxed">
            <strong>Importante:</strong> Estes Termos de Uso constituem um contrato legal entre você e o Sustenta. O uso da plataforma implica na aceitação integral deste documento. Se tiver dúvidas, entre em contato antes de prosseguir.
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

        {/* CTA contato */}
        <div className="bg-emerald-600 rounded-2xl p-8 text-white text-center">
          <Scale className="w-8 h-8 text-emerald-200 mx-auto mb-4" />
          <h3 className="font-black text-lg mb-2">Dúvidas sobre os Termos?</h3>
          <p className="text-emerald-100 text-sm mb-4 leading-relaxed">
            Nossa equipe jurídica está disponível para esclarecer qualquer questão relacionada a estes Termos de Uso.
          </p>
          <a href="mailto:juridico@sustenta.app" className="inline-block bg-white text-emerald-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-emerald-50 transition-colors">
            juridico@sustenta.app
          </a>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 Sustenta — Gestão Inteligente de Consumo e Sustentabilidade</p>
      </footer>
    </div>
  );
};