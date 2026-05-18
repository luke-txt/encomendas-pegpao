// ══════════════════════════════════════════════
//  PegPão — Webhook Asaas (com logs de debug)
//  Caminho no projeto: /api/asaas-webhook.js
// ══════════════════════════════════════════════

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase }                  from 'firebase-admin/database';

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential:  cert(JSON.parse(process.env.FIREBASE_SA_KEY)),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }
  return getDatabase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const evento = req.body;
  console.log('[Webhook] Evento:', JSON.stringify(evento));

  const { event, payment } = evento;

  if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
    return res.status(200).json({ ok: true, ignorado: true });
  }

  const numeroPedido = payment?.externalReference;
  console.log('[Webhook] Número do pedido:', numeroPedido);

  if (!numeroPedido) {
    return res.status(200).json({ ok: true, sem_referencia: true });
  }

  try {
    const db = getDb();
    console.log('[Webhook] DB URL:', process.env.FIREBASE_DB_URL);

    const pedidosSnap = await db.ref('pedidos').once('value');
    const todasPadarias = pedidosSnap.val() || {};
    console.log('[Webhook] Padarias no DB:', Object.keys(todasPadarias));

    let padariaId  = null;
    let clienteUid = null;

    for (const [padId, pedidos] of Object.entries(todasPadarias)) {
      console.log('[Webhook] Pedidos em', padId + ':', Object.keys(pedidos || {}));
      if (pedidos[numeroPedido]) {
        padariaId  = padId;
        clienteUid = pedidos[numeroPedido].clienteUid;
        break;
      }
    }

    if (!padariaId) {
      console.warn('[Webhook] Pedido não encontrado:', numeroPedido);
      return res.status(200).json({
        ok: true,
        pedido_nao_encontrado: true,
        padarias: Object.keys(todasPadarias),
        numeroPedido
      });
    }

    const updates = {};
    updates['pedidos/' + padariaId + '/' + numeroPedido + '/status']               = 'CONFIRMADO';
    updates['pedidos/' + padariaId + '/' + numeroPedido + '/pagamentoConfirmadoEm'] = Date.now();
    if (clienteUid) {
      updates['pedidos_cliente/' + clienteUid + '/' + numeroPedido + '/status']               = 'CONFIRMADO';
      updates['pedidos_cliente/' + clienteUid + '/' + numeroPedido + '/pagamentoConfirmadoEm'] = Date.now();
    }

    await db.ref().update(updates);
    console.log('[Webhook] Pedido', numeroPedido, 'atualizado para CONFIRMADO');
    return res.status(200).json({ ok: true, pedido: numeroPedido, status: 'CONFIRMADO' });

  } catch (err) {
    console.error('[Webhook] Erro:', err.message);
    return res.status(500).json({ erro: err.message });
  }
}
