/**
 * Firestore com permissão de servidor (Admin SDK), usado só nas funções.
 * Precisa da variável FIREBASE_SERVICE_ACCOUNT_BASE64: o JSON da conta de serviço
 * do Firebase (Configurações do projeto → Contas de serviço → Gerar nova chave),
 * convertido para base64. Nunca coloque esse JSON no Git nem em variável VITE_.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ErroHttp } from './seguranca.js';

export function adminConfigurado() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
}

export function bancoAdmin() {
  if (getApps().length === 0) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!b64) throw new ErroHttp(503, 'Servidor sem acesso ao banco de dados configurado.');
    let conta;
    try {
      conta = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    } catch {
      console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_BASE64 inválida');
      throw new ErroHttp(503, 'Servidor sem acesso ao banco de dados configurado.');
    }
    initializeApp({ credential: cert(conta) });
  }
  return getFirestore();
}
