/**
 * Estado da aba Assinaturas: dados reais (banco conectado) ou de exemplo.
 */
import React from 'react';
import { auth } from '../../../services/firebase';
import { CATALOGO_PLANOS } from '../../../services/catalogoPlanos';
import {
  HORAS_ESTIMADAS,
  SERVICOS,
  TIPO_SERVICO,
  conexoesDe,
  avaliarAssinatura,
  detectarAssinaturas,
  mesDe,
  resumirRelatorio,
  resumirUsoMensal,
  type AvaliacaoAssinatura,
  type ConexaoBanco,
  type DadosStreaming,
  type RespostaTv,
  type ResumoRelatorio,
  type Servico,
  type UsoMensal,
} from '../../../services/streaming';
import {
  ouvirExtensao,
  ouvirNomesBancos,
  ouvirRespostasTv,
  ouvirStreaming,
  ouvirUsoMensal,
  salvarRespostaTv,
  type NomesBancos,
  type RespostasTv,
  type SituacaoExtensao,
} from '../../../services/assinaturas';
import { MES_EXEMPLO, TRANSACOES_EXEMPLO, USO_EXEMPLO } from './dadosExemplo';

export type ModoStreaming = 'carregando' | 'exemplo' | 'real';

export interface EstadoStreaming {
  modo: ModoStreaming;
  dados: DadosStreaming | null;
  extensao: SituacaoExtensao | null;
  /** Bancos conectados, já com o nome que a pessoa deu (se deu). */
  conexoes: (ConexaoBanco & { nome: string })[];
  avaliacoes: AvaliacaoAssinatura[];
  resumo: ResumoRelatorio;
  mesRotulo: string;
  responderTv: (servico: Servico, resposta: RespostaTv) => Promise<void>;
}

function rotuloDoMes(data: Date): string {
  const t = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function respostasExemplo(): RespostasTv {
  const r: RespostasTv = {};
  for (const s of SERVICOS) {
    const resposta = USO_EXEMPLO[s].respostaTv;
    if (resposta) r[s] = resposta;
  }
  return r;
}

export function useStreaming(): EstadoStreaming {
  const uid = auth.currentUser?.uid ?? null;
  const [dados, setDados] = React.useState<DadosStreaming | null | undefined>(uid ? undefined : null);
  const [tvAtual, setTvAtual] = React.useState<RespostasTv>({});
  const [tvAnterior, setTvAnterior] = React.useState<RespostasTv>({});
  const [tvExemplo, setTvExemplo] = React.useState<RespostasTv>(respostasExemplo);
  const [usoAtual, setUsoAtual] = React.useState<UsoMensal | null>(null);
  const [usoAnterior, setUsoAnterior] = React.useState<UsoMensal | null>(null);
  const [extensao, setExtensao] = React.useState<SituacaoExtensao | null>(null);
  const [nomesBancos, setNomesBancos] = React.useState<NomesBancos>({});

  const hoje = React.useMemo(() => new Date(), []);
  const mes = mesDe(hoje);
  const mesAnterior = mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));

  React.useEffect(() => {
    if (!uid) return;
    // Sem permissão ou offline: cai nos dados de exemplo.
    const pararDados = ouvirStreaming(uid, setDados, () => setDados(null));
    const pararExtensao = ouvirExtensao(uid, setExtensao);
    const pararNomes = ouvirNomesBancos(uid, setNomesBancos);
    return () => {
      pararDados();
      pararExtensao();
      pararNomes();
    };
  }, [uid]);

  const listaConexoes = React.useMemo(() => conexoesDe(dados), [dados]);
  const conectado = listaConexoes.length > 0;
  const conexoes = React.useMemo(
    () => listaConexoes.map((c) => ({ ...c, nome: nomesBancos[c.itemId] || c.banco || 'Banco conectado' })),
    [listaConexoes, nomesBancos],
  );

  React.useEffect(() => {
    if (!uid || !conectado) return;
    const parar = [
      ouvirRespostasTv(uid, mes, setTvAtual),
      ouvirRespostasTv(uid, mesAnterior, setTvAnterior),
      ouvirUsoMensal(uid, mes, setUsoAtual),
      ouvirUsoMensal(uid, mesAnterior, setUsoAnterior),
    ];
    return () => parar.forEach((p) => p());
  }, [uid, conectado, mes, mesAnterior]);

  const avaliacoes = React.useMemo(() => {
    if (conectado && dados) {
      const atual = resumirUsoMensal(usoAtual, mes);
      const passado = resumirUsoMensal(usoAnterior, mesAnterior);
      return dados.assinaturas.map((a) => {
        const tvPassado = tvAnterior[a.servico];
        // Mês anterior: minutos da extensão (se ela já mandava dados) + estimativa fora do computador.
        const temDadoAnterior = usoAnterior !== null || !!tvPassado;
        const horasMesAnterior = temDadoAnterior
          ? passado[a.servico].minutos / 60 + (tvPassado ? HORAS_ESTIMADAS[TIPO_SERVICO[a.servico]][tvPassado] : 0)
          : null;
        return avaliarAssinatura(
          a,
          {
            minutosExtensao: atual[a.servico].minutos,
            minutosPorDia: atual[a.servico].porDia,
            respostaTv: tvAtual[a.servico] ?? null,
            horasMesAnterior,
          },
          CATALOGO_PLANOS[a.servico] ?? [],
        );
      });
    }
    return detectarAssinaturas(TRANSACOES_EXEMPLO, CATALOGO_PLANOS).map((a) =>
      avaliarAssinatura(a, { ...USO_EXEMPLO[a.servico], respostaTv: tvExemplo[a.servico] ?? null }, CATALOGO_PLANOS[a.servico] ?? []),
    );
  }, [conectado, dados, tvAtual, tvAnterior, tvExemplo, usoAtual, usoAnterior, mes, mesAnterior]);

  const resumo = React.useMemo(
    () =>
      resumirRelatorio(
        avaliacoes.map((a) => ({ servico: a.assinatura.servico, valorPago: a.assinatura.valor, horas: a.horas.total, recomendacao: a.recomendacao })),
      ),
    [avaliacoes],
  );

  const responderTv = React.useCallback(
    async (servico: Servico, resposta: RespostaTv) => {
      if (conectado && uid) {
        await salvarRespostaTv(uid, mes, tvAtual, servico, resposta);
      } else {
        setTvExemplo((atual) => ({ ...atual, [servico]: resposta }));
      }
    },
    [conectado, uid, mes, tvAtual],
  );

  const modo: ModoStreaming = dados === undefined ? 'carregando' : conectado ? 'real' : 'exemplo';

  return {
    modo,
    dados: dados ?? null,
    extensao,
    conexoes,
    avaliacoes,
    resumo,
    mesRotulo: modo === 'real' ? rotuloDoMes(hoje) : MES_EXEMPLO,
    responderTv,
  };
}
