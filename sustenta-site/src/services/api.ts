import { auth } from './firebase';

/**
 * Chama uma função serverless (Netlify Functions) enviando o token de login
 * do Firebase. O servidor valida o token antes de fazer qualquer coisa.
 * Padrão para TODA integração que precise de chave secreta (IA, Open Finance,
 * pagamentos...): a chave fica na função, nunca no front-end.
 */
/** Erro de uma função serverless, com o status e a mensagem (já genérica) do servidor. */
export class ErroFuncao extends Error {
  readonly status: number;
  readonly mensagemServidor: string | null;
  readonly codigo: string | null;
  constructor(mensagem: string, status: number, mensagemServidor: string | null, codigo: string | null) {
    super(mensagem);
    this.name = 'ErroFuncao';
    this.status = status;
    this.mensagemServidor = mensagemServidor;
    this.codigo = codigo;
  }
}

export async function chamarFuncaoAutenticada<T>(nome: string, corpo: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const token = await user.getIdToken();
  const res = await fetch(`/.netlify/functions/${encodeURIComponent(nome)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(corpo),
  });

  if (!res.ok) {
    const dados = (await res.json().catch(() => null)) as { message?: unknown; codigo?: unknown } | null;
    throw new ErroFuncao(
      `Falha na função ${nome}: ${res.status}`,
      res.status,
      typeof dados?.message === 'string' ? dados.message : null,
      typeof dados?.codigo === 'string' ? dados.codigo : null,
    );
  }

  return (await res.json()) as T;
}
