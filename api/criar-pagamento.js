// ══════════════════════════════════════════════
//  PegPão — API serverless: Gerar link Mercado Pago
//  Caminho no projeto: /api/criar-pagamento.js
// ══════════════════════════════════════════════
//
//  Configure a variável de ambiente no Vercel:
//  MP_ACCESS_TOKEN = seu Access Token do Mercado Pago
//
//  Exemplo de chamada (frontend):
//  POST /api/criar-pagamento
//  Body: { numeroPedido, total, itens, clienteEmail, clienteNome, dataRetirada }
// ══════════════════════════════════════════════

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { numeroPedido, total, itens, clienteEmail, clienteNome, dataRetirada } = req.body;

  // Validação básica
  if (!numeroPedido || !total || !itens?.length) {
    return res.status(400).json({ erro: 'Dados do pedido incompletos.' });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ erro: 'Token do Mercado Pago não configurado.' });
  }

  try {
    // Monta os itens no formato do Mercado Pago
    const itensMp = itens.map(i => ({
      id:          String(i.id || i.nome),
      title:       i.nome,
      quantity:    Number(i.qty || 1),
      unit_price:  Number(i.preco || 0),
      currency_id: 'BRL',
    }));

    // Cria a preferência (link de pagamento) na API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
        'X-Idempotency-Key': `pegpao-${numeroPedido}`, // evita duplicatas
      },
      body: JSON.stringify({
        items: itensMp,

        payer: {
          name:  clienteNome  || '',
          email: clienteEmail || '',
        },

        // Metadados para rastrear o pedido no painel do MP
        metadata: {
          pedido_num:     numeroPedido,
          data_retirada:  dataRetirada,
          cliente_nome:   clienteNome,
          cliente_email:  clienteEmail,
        },

        // URLs de retorno após o pagamento
        back_urls: {
          success: `https://encomendas-pegpao.vercel.app/?pagamento=sucesso&pedido=${numeroPedido}`,
          failure: `https://encomendas-pegpao.vercel.app/?pagamento=erro&pedido=${numeroPedido}`,
          pending: `https://encomendas-pegpao.vercel.app/?pagamento=pendente&pedido=${numeroPedido}`,
        },
        auto_return: 'approved', // redireciona automaticamente se aprovado

        // Configurações extras
        statement_descriptor: 'PEGPAO PADARIA', // aparece na fatura do cartão
        external_reference:   numeroPedido,       // ID para cruzar com seus pedidos
        expires: false,
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[MP Error]', mpData);
      return res.status(mpResponse.status).json({ erro: 'Erro ao criar pagamento no Mercado Pago.', detalhe: mpData });
    }

    // Retorna os links para o frontend
    return res.status(200).json({
      linkPagamento: mpData.init_point,        // link de produção (use este)
      linkSandbox:   mpData.sandbox_init_point, // link de teste
      preferenceId:  mpData.id,
    });

  } catch (err) {
    console.error('[MP Exception]', err);
    return res.status(500).json({ erro: 'Erro interno ao processar pagamento.' });
  }
}
