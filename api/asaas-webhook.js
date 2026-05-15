// ══════════════════════════════════════════════
//  PegPão — Webhook Asaas
//  Caminho no projeto: /api/asaas-webhook.js
// ══════════════════════════════════════════════
//
//  Após fazer deploy, cadastre a URL do webhook no Asaas:
//  Sandbox: https://sandbox.asaas.com → Integrações → Webhooks
//  URL: https://encomendas-pegpao.vercel.app/api/asaas-webhook
//  Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE
//
//  Variáveis de ambiente necessárias no Vercel:
//  FIREBASE_DB_URL    = https://encomendas-pegpao-default-rtdb.firebaseio.com
//  FIREBASE_SA_KEY    = JSON da service account do Firebase (veja instruções abaixo)
// ══════════════════════════════════════════════

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase }                  from 'firebase-admin/database';

// Inicializa o Firebase Admin (só uma vez)
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

    // Busca o pedido nos pedidos_cliente para descobrir o UID e a padaria
    // Estratégia: busca em pedidos de todas as padarias pelo número
    const pedidosSnap = await db.ref('pedidos').once('value');
    const todasPadarias = pedidosSnap.val() || {};

    let padariaId = null;
    let clienteUid = null;

    // Percorre padarias para achar o pedido
    for (const [padId, pedidos] of Object.entries(todasPadarias)) {
      if (pedidos[numeroPedido]) {
        padariaId  = padId;
        clienteUid = pedidos[numeroPedido].clienteUid;
        break;
      }
    }

    if (!padariaId) {
      console.warn('[Webhook] Pedido não encontrado no Firebase:', numeroPedido);
      return res.status(200).json({ ok: true, pedido_nao_encontrado: true });
    }

    // Atualiza status para CONFIRMADO nas duas coleções
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
