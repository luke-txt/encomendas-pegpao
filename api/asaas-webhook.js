// ══════════════════════════════════════════════
//  PegPão — Webhook Asaas
//  Caminho no projeto: /api/asaas-webhook.js
// ══════════════════════════════════════════════
//
//  Após fazer deploy, cadastre a URL do webhook no Asaas:
//  Sandbox: https://sandbox.asaas.com → Integrações → Webhooks
//  URL: https://sua-url-da-vercel.app/api/asaas-webhook
//  Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE
//
//  Variáveis de ambiente necessárias no Vercel:
//  FIREBASE_DB_URL    = https://encomendas-pegpao-default-rtdb.firebaseio.com
//  FIREBASE_SA_KEY    = JSON da service account minificado (sem quebras de linha)
// ══════════════════════════════════════════════

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase }                  from 'firebase-admin/database';

// Inicializa o Firebase Admin
function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SA_KEY)),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }
  return getDatabase();
}

export default async function handler(req, res) {
  // Asaas faz POST para o webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const evento = req.body;
  console.log('[Webhook Asaas] Evento recebido:', JSON.stringify(evento));

  const { event, payment } = evento;

  // Só processa eventos de pagamento confirmado/recebido
  if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
    return res.status(200).json({ ok: true, ignorado: true });
  }

  const numeroPedido = payment?.externalReference; // ex: "PEG325080"
  if (!numeroPedido) {
    return res.status(200).json({ ok: true, sem_referencia: true });
  }

  try {
    const db = getDb();

    // NOVO: Busca super rápida apenas no índice criado na hora da compra
    const indexSnap = await db.ref(`pedidos_index/${numeroPedido}`).once('value');
    const indexData = indexSnap.val();

    if (!indexData) {
      console.warn('[Webhook] Pedido não encontrado no índice:', numeroPedido);
      return res.status(200).json({ ok: true, pedido_nao_encontrado: true });
    }

    const padariaId = indexData.padariaId;
    const clienteUid = indexData.clienteUid;

    // Atualiza status para CONFIRMADO nas duas coleções e encerra
    const updates = {};
    updates[`pedidos/${padariaId}/${numeroPedido}/status`]          = 'CONFIRMADO';
    updates[`pedidos/${padariaId}/${numeroPedido}/pagamentoConfirmadoEm`] = Date.now();

    if (clienteUid) {
      updates[`pedidos_cliente/${clienteUid}/${numeroPedido}/status`]          = 'CONFIRMADO';
      updates[`pedidos_cliente/${clienteUid}/${numeroPedido}/pagamentoConfirmadoEm`] = Date.now();
    }

    await db.ref().update(updates);

    console.log(`[Webhook] Pedido ${numeroPedido} atualizado para CONFIRMADO`);
    return res.status(200).json({ ok: true, pedido: numeroPedido, status: 'CONFIRMADO' });

  } catch (err) {
    console.error('[Webhook] Erro ao atualizar Firebase:', err);
    return res.status(500).json({ erro: 'Erro interno no webhook.' });
  }
}
