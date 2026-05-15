// ══════════════════════════════════════════════
//  PegPão — API serverless: Consultar status Asaas
//  Caminho no projeto: /api/asaas-status.js
// ══════════════════════════════════════════════

const ASAAS_BASE = 'https://sandbox.asaas.com/api/v3'; // troque para produção quando for ao ar

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { numeroPedido } = req.query;
  if (!numeroPedido) {
    return res.status(400).json({ erro: 'numeroPedido obrigatório.' });
  }

  const API_KEY = process.env.ASAAS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ erro: 'API key não configurada.' });
  }

  try {
    // Busca a cobrança pelo externalReference (= numeroPedido)
    const res2 = await fetch(
      `${ASAAS_BASE}/payments?externalReference=${encodeURIComponent(numeroPedido)}&limit=1`,
      { headers: { 'access_token': API_KEY, 'Content-Type': 'application/json' } }
    );
    const data = await res2.json();

    if (!res2.ok || !data.data?.length) {
      return res.status(404).json({ erro: 'Cobrança não encontrada.', numeroPedido });
    }

    const cobranca = data.data[0];
    const pago = ['CONFIRMED', 'RECEIVED'].includes(cobranca.status);

    return res.status(200).json({
      numeroPedido,
      status:    cobranca.status,   // PENDING, CONFIRMED, RECEIVED, OVERDUE...
      pago,                          // true se pagamento confirmado
      valor:     cobranca.value,
      cobrancaId: cobranca.id,
    });

  } catch (err) {
    console.error('[asaas-status] Erro:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}
