import { auth } from './firebase';

/**
 * Chama uma função serverless (Netlify Functions) enviando o token de login
 * do Firebase. O servidor valida o token antes de fazer qualquer coisa.
 * Padrão para TODA integração que precise de chave secreta (IA, Open Finance,
 * pagamentos...): a chave fica na função, nunca no front-end.
 */
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
    throw new Error(`Falha na função ${nome}: ${res.status}`);
  }

  return (await res.json()) as T;
}
