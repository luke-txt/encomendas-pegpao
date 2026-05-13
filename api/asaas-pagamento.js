// ══════════════════════════════════════════════
//  PegPão — API serverless: Gerar link Asaas
//  Caminho no projeto: /api/asaas-pagamento.js
// ══════════════════════════════════════════════
//
//  Configure a variável de ambiente no Vercel:
//  ASAAS_API_KEY = sua API key do Asaas
//
//  Para sandbox (testes): https://sandbox.asaas.com
//  Para produção:         https://api.asaas.com
// ══════════════════════════════════════════════

const ASAAS_BASE = 'https://sandbox.asaas.com/api/v3'; // troque para https://api.asaas.com/v3 em produção

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { numeroPedido, total, clienteEmail, clienteNome, dataRetirada } = req.body;

  if (!numeroPedido || !total || !clienteEmail) {
    return res.status(400).json({ erro: 'Dados do pedido incompletos.' });
  }

  const API_KEY = process.env.ASAAS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ erro: 'API key do Asaas não configurada.' });
  }

  const headers = {
    'access_token': API_KEY,
    'Content-Type': 'application/json',
  };

  try {
    // ── 1. Busca ou cria o cliente no Asaas ──────────────────────────────
    let customerId = null;

    const buscaRes = await fetch(
      `${ASAAS_BASE}/customers?email=${encodeURIComponent(clienteEmail)}&limit=1`,
      { headers }
    );
    const buscaData = await buscaRes.json();

    if (buscaData.data?.length > 0) {
      // Cliente já existe
      customerId = buscaData.data[0].id;
    } else {
      // Cria o cliente
      const criarRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name:  clienteNome  || clienteEmail.split('@')[0],
          email: clienteEmail,
          externalReference: 'pegpao-' + clienteEmail.replace(/[^a-z0-9]/gi, ''),
        }),
      });
      const criarData = await criarRes.json();
      if (!criarRes.ok) {
        console.error('[Asaas] Erro ao criar cliente:', criarData);
        return res.status(criarRes.status).json({ erro: 'Erro ao cadastrar cliente no Asaas.', detalhe: criarData });
      }
      customerId = criarData.id;
    }

    // ── 2. Calcula data de vencimento (hoje + 1 dia) ──────────────────────
    const venc = new Date();
    venc.setDate(venc.getDate() + 1);
    const dueDate = venc.toISOString().split('T')[0]; // ex: 2026-05-13

    // ── 3. Cria a cobrança ────────────────────────────────────────────────
    const cobRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer:          customerId,
        billingType:       'UNDEFINED',    // cliente escolhe: Pix, boleto ou cartão
        value:             Number(total),
        dueDate,
        description:       `Pedido PegPão #${numeroPedido} — Retirada: ${dataRetirada}`,
        externalReference: numeroPedido,
        postalService:     false,
      }),
    });

    const cobData = await cobRes.json();

    if (!cobRes.ok) {
      console.error('[Asaas] Erro ao criar cobrança:', cobData);
      return res.status(cobRes.status).json({ erro: 'Erro ao criar cobrança no Asaas.', detalhe: cobData });
    }

    // ── 4. Retorna o link de pagamento ────────────────────────────────────
    return res.status(200).json({
      linkPagamento: cobData.invoiceUrl,  // link de pagamento do Asaas
      cobrancaId:    cobData.id,
      status:        cobData.status,
    });

  } catch (err) {
    console.error('[Asaas] Exception:', err);
    return res.status(500).json({ erro: 'Erro interno ao processar pagamento.' });
  }
}
