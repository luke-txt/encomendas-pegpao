// ══════════════════════════════════════════════
// pedidos.js — Meus Pedidos (cliente)
// ══════════════════════════════════════════════

async function abrirMeusPedidos() {
  fecharModal('modal-auth');
  if (!currentUser) { abrirModal('modal-auth'); return; }
  abrirModal('modal-pedidos');

  const lista = document.getElementById('lista-meus-pedidos');
  lista.innerHTML = '<div class="empty-state">Carregando...</div>';

  try {
    const snap = await db.ref('pedidos_cliente/' + currentUser.uid)
      .orderByChild('criadoEm').once('value');

    if (!snap.exists()) {
      lista.innerHTML = `
        <div class="empty-state">
          <div style="font-size:40px;margin-bottom:12px">📦</div>
          <div style="font-size:14px;font-weight:600">Nenhum pedido ainda</div>
          <div style="font-size:12px;margin-top:4px;color:var(--muted)">Faça seu primeiro pedido!</div>
        </div>`;
      return;
    }

    const peds = [];
    snap.forEach(c => peds.push(c.val()));
    peds.sort((a, b) => b.criadoEm - a.criadoEm);

    lista.innerHTML = peds.map(p => pedidoCardCliente(p)).join('');

  } catch(e) {
    lista.innerHTML = '<div class="empty-state" style="color:var(--red)">Erro ao carregar pedidos.</div>';
  }
}

function pedidoCardCliente(p) {
  const steps     = ['PENDENTE','CONFIRMADO','PREPARO','PRONTO'];
  const stepLabels = ['Pendente','Confirmado','Em preparo','Pronto'];
  const ci        = steps.indexOf(p.status);

  const stCls   = { PENDENTE:'st-pendente', CONFIRMADO:'st-confirmado', PREPARO:'st-preparo', PRONTO:'st-pronto' }[p.status] || 'st-pendente';
  const stLabel = { PENDENTE:'🕐 Pendente', CONFIRMADO:'✅ Confirmado', PREPARO:'👨‍🍳 Em preparo', PRONTO:'🎉 Pronto!' }[p.status] || p.status;

  const timeline = steps.map((s, i) => `
    ${i > 0 ? `<div class="st-line ${i <= ci ? 'done' : ''}"></div>` : ''}
    <div class="st-step ${i < ci ? 'done' : i === ci ? 'current' : ''}">
      <div class="st-step-dot"></div>
      <div class="st-step-label">${stepLabels[i]}</div>
    </div>`).join('');

  const itensTxt = p.itens?.map(i =>
    `${i.qty}× ${i.nome}${i.sabor ? ` (${i.sabor})` : ''}`
  ).join(' · ') || '—';

  return `
    <div class="pedido-card">
      <div class="ped-header">
        <div class="ped-num">#${p.num}</div>
        <div class="ped-status ${stCls}">${stLabel}</div>
      </div>
      <div class="ped-padaria">📍 ${p.padariaNome}</div>
      <div class="ped-itens">${itensTxt}</div>
      <div class="ped-footer">
        <div class="ped-total">${fmtPreco(p.total)}</div>
        <div class="ped-data">Retirada: ${fmtData(p.dataRetirada)}</div>
      </div>
      <div class="status-timeline">${timeline}</div>
    </div>`;
}
