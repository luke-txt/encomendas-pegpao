// ══════════════════════════════════════════════
//  PegPão — API: Criar usuário do painel
//  Caminho: /api/criar-usuario.js
// ══════════════════════════════════════════════
//  Variáveis necessárias no Vercel:
//  FIREBASE_DB_URL  = https://encomendas-pegpao-default-rtdb.firebaseio.com
//  FIREBASE_SA_KEY  = JSON da service account do Firebase
// ══════════════════════════════════════════════

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth }     from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

function initFirebase() {
  if (!getApps().length) {
    initializeApp({
      credential:  cert(JSON.parse(process.env.FIREBASE_SA_KEY)),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }
  return { auth: getAuth(), db: getDatabase() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const { nome, email, senha, nivel, padaria_id } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Dados incompletos.' });

  try {
    const { auth, db } = initFirebase();

    // Cria usuário no Firebase Auth
    const user = await auth.createUser({ email, password: senha, displayName: nome });

    // Salva perfil no Realtime Database
    await db.ref('painel_usuarios/' + user.uid).set({
      nome,
      email,
      nivel:      nivel      || 'GERENTE',
      padaria_id: padaria_id || null,
      ativo:      true,
      criadoEm:   Date.now(),
    });

    return res.status(200).json({ ok: true, uid: user.uid });
  } catch (err) {
    console.error('[criar-usuario]', err);
    const msg = err.code === 'auth/email-already-exists'
      ? 'Email já cadastrado.'
      : err.message;
    return res.status(400).json({ erro: msg });
  }
}
