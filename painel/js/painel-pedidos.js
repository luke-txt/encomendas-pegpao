// ══════════════════════════════════════════════
// painel-pedidos.js — Gestão de pedidos
// ══════════════════════════════════════════════

let todosPedidos = [], pedidoAberto = null;
let filtroAtual = 'todos', buscaAtual = '';
let pedidosUnsub = null;

// ── Carrega pedidos em tempo real ─────────────
function carregarPedidos(pid) {
  if (pedidosUnsub) { pedidosUnsub(); pedidosUnsub = null; }
  const ref = db.ref('pedidos/' + pid);
  const handler = snap => {
    todosPedidos = [];
    if (snap.exists()) snap.forEach(c => { const v=c.val(); if(v) todosPedidos.push({...v,_key:c.key}); });
    todosPedidos.sort((a,b) => b.criadoEm - a.criadoEm);
    atualizarBadge();
    renderDashboardApp();
    if (document.getElementById('page-pedidos')?.classList.contains('active')) renderPedidos();
  };
  ref.on('value', handler);
  pedidosUnsub = () => ref.off('value', handler);
}

function atualizarBadge() {
  const pend = todosPedidos.filter(p => p.status === 'PENDENTE').length;
  const badge = document.getElementById('nav-badge');
  if (badge) badge.classList.toggle('show', pend > 0);
}

// ── Dashboard da padaria ──────────────────────
function renderDashboardApp() {
  const padaria  = PADARIAS.find(p => p.id === currentPadariaId);
  const hoje     = dataHoje();
  const pendentes  = todosPedidos.filter(p => p.status === 'PENDENTE');
  const confirmados= todosPedidos.filter(p => p.status === 'CONFIRMADO');
  const preparo    = todosPedidos.filter(p => p.status === 'PREPARO');
  const prontos    = todosPedidos.filter(p => p.status === 'PRONTO');
  const paraHoje   = todosPedidos.filter(p => p.dataRetirada === hoje && p.status !== 'PRONTO');

  document.getElementById('dash-sub').textContent    = saudacao();
  document.getElementById('dash-main').innerHTML     = `${saudacao()},<br><em>${currentUser.nome}!</em>`;
  document.getElementById('dash-detail').textContent = (padaria?.nome || currentPadariaId) + ' · ' + currentUser.nome;

  document.getElementById('dash-metrics').innerHTML = `
    <div class="metric-box" style="--m-color:var(--amber)" onclick="filtrarPedidosNav('PENDENTE')">
      <div class="metric-label">Pendentes</div>
      <div class="metric-value amber">${pendentes.length}</div>
      <div class="metric-sub">aguardando ação</div>
    </div>
    <div class="metric-box" style="--m-color:var(--gold)" onclick="filtrarPedidosNav('PREPARO')">
      <div class="metric-label">Em preparo</div>
      <div class="metric-value gold">${preparo.length}</div>
      <div class="metric-sub">sendo preparados</div>
    </div>
    <div class="metric-box" style="--m-color:var(--green)" onclick="filtrarPedidosNav('PRONTO')">
      <div class="metric-label">Prontos</div>
      <div class="metric-value green">${prontos.length}</div>
      <div class="metric-sub">para retirada</div>
    </div>
    <div class="metric-box" style="--m-color:var(--blue)" onclick="filtrarPedidosNav('todos')">
      <div class="metric-label">Total</div>
      <div class="metric-value blue">${todosPedidos.length}</div>
      <div class="metric-sub">pedidos</div>
    </div>`;

  const atEl = document.getElementById('dash-atencao');
  if (atEl) {
    atEl.innerHTML = pendentes.length
      ? pendentes.slice(0,3).map(p => pedidoCardHTML(p)).join('')
      : '<div class="empty-state" style="padding:16px">✅ Nenhum pedido pendente</div>';
  }

  const hjEl = document.getElementById('dash-hoje');
  if (hjEl) {
    hjEl.innerHTML = paraHoje.length
      ? paraHoje.slice(0,5).map(p => pedidoCardHTML(p)).join('')
      : '<div class="empty-state" style="padding:16px">Nenhum pedido com retirada hoje</div>';
  }
}

// ── Renderiza lista de pedidos ────────────────
function renderPedidos() {
  let lista = [...todosPedidos];
  if (filtroAtual !== 'todos') lista = lista.filter(p => p.status === filtroAtual);
  if (buscaAtual) lista = lista.filter(p =>
    (p.num||'').toLowerCase().includes(buscaAtual) ||
    (p.clienteNome||'').toLowerCase().includes(buscaAtual)
  );
  const el = document.getElementById('lista-pedidos');
  if (el) el.innerHTML = lista.length
    ? lista.map(p => pedidoCardHTML(p)).join('')
    : '<div class="empty-state">Nenhum pedido encontrado.</div>';
}

// ── HTML de um card de pedido ─────────────────
function pedidoCardHTML(p) {
  const steps = ['PENDENTE','CONFIRMADO','PREPARO','PRONTO'];
  const sl    = ['Pendente','Confirmado','Em preparo','Pronto'];
  const ci    = steps.indexOf(p.status);
  const hoje  = dataHoje();
  const urgente = p.dataRetirada === hoje && p.status !== 'PRONTO';

  const stCls   = { PENDENTE:'st-pendente', CONFIRMADO:'st-confirmado', PREPARO:'st-preparo', PRONTO:'st-pronto' }[p.status] || 'st-pendente';
  const stLabel = { PENDENTE:'🕐 Pendente', CONFIRMADO:'✅ Confirmado', PREPARO:'👨‍🍳 Em preparo', PRONTO:'🎉 Pronto!' }[p.status] || p.status;

  const timeline = steps.map((s,i) => `
    ${i>0 ? `<div class="st-line ${i<=ci?'done':''}"></div>` : ''}
    <div class="st-step ${i<ci?'done':i===ci?'current':''}">
      <div class="st-step-dot"></div>
      <div class="st-step-label">${sl[i]}</div>
    </div>`).join('');

  const itensTxt = p.itens?.map(i =>
    `${i.qty}× ${i.nome}${i.sabor?' ('+i.sabor+')':''}${i.obs?' <span style="color:var(--muted);font-size:10px">"'+i.obs+'"</span>':''}`
  ).join('<br>') || '—';

  return `
    <div class="pedido-card${urgente?' urgente':''}" onclick="abrirPedido('${p._key||p.num}')">
      ${urgente ? '<div class="ped-urgente-tag">HOJE</div>' : ''}
      <div class="ped-header">
        <div class="ped-num">#${p.num}</div>
        <div class="ped-status ${stCls}">${stLabel}</div>
      </div>
      <div class="ped-cliente">${p.clienteNome || '—'}</div>
      <div class="ped-itens-txt">${itensTxt}</div>
      <div class="ped-footer">
        <div class="ped-total">${fmtPreco(p.total)}</div>
        <div class="ped-data">Retirada: ${fmtData(p.dataRetirada)}</div>
      </div>
      <div class="status-timeline">${timeline}</div>
    </div>`;
}

// ── Abrir detalhe do pedido ───────────────────
function abrirPedido(key) {
  const p = todosPedidos.find(x => (x._key || x.num) === key);
  if (!p) return;
  pedidoAberto = p;

  const stCls   = { PENDENTE:'st-pendente', CONFIRMADO:'st-confirmado', PREPARO:'st-preparo', PRONTO:'st-pronto' }[p.status] || 'st-pendente';
  const stLabel = { PENDENTE:'🕐 Pendente', CONFIRMADO:'✅ Confirmado', PREPARO:'👨‍🍳 Em preparo', PRONTO:'🎉 Pronto!' }[p.status] || p.status;

  document.getElementById('modal-ped-title').textContent = '📦 Pedido #' + p.num;
  document.getElementById('modal-ped-content').innerHTML = `
    <div style="margin-bottom:12px">
      <span class="ped-status ${stCls}">${stLabel}</span>
    </div>
    <div style="font-size:15px;font-weight:700;font-family:var(--ff-display);margin-bottom:3px">${p.clienteNome||'—'}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${p.clienteEmail||''}</div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Itens do pedido</div>
      ${p.itens?.map(i=>`
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <span>${i.qty}× ${i.nome}</span>
            ${i.sabor ? `<span style="color:var(--gold);font-size:11px"> · ${i.sabor}</span>` : ''}
            ${i.obs   ? `<div style="color:var(--muted);font-size:11px;font-style:italic">"${i.obs}"</div>` : ''}
          </div>
          <span style="font-family:var(--ff-mono);color:var(--gold)">${fmtPreco((i.preco||0)*i.qty)}</span>
        </div>`).join('') || ''}
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;font-size:14px;font-weight:700">
        <span>Total</span>
        <span style="font-family:var(--ff-mono);color:var(--gold)">${fmtPreco(p.total)}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px">Pagamento</div>
        <div style="font-size:13px;font-weight:600">${{pix:'🟢 Pix',credito:'💳 Crédito',debito:'🏦 Débito'}[p.pagamento]||p.pagamento||'—'}</div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px">Retirada</div>
        <div style="font-size:13px;font-weight:600">${fmtData(p.dataRetirada)}</div>
      </div>
    </div>`;

  // Destaca botão do status atual
  document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
  const mapa = { PENDENTE:'.sb-pendente', CONFIRMADO:'.sb-confirmado', PREPARO:'.sb-preparo', PRONTO:'.sb-pronto' };
  if (mapa[p.status]) document.querySelector(mapa[p.status])?.classList.add('active');

  abrirModal('modal-pedido');
}

// ── Atualizar status ──────────────────────────
async function atualizarStatus(novoStatus) {
  if (!pedidoAberto || !currentPadariaId) return;
  mostrarLoading(true);
  const key = pedidoAberto._key || pedidoAberto.num;
  try {
    await db.ref('pedidos/' + currentPadariaId + '/' + key + '/status').set(novoStatus);
    await db.ref('pedidos_cliente/' + pedidoAberto.clienteUid + '/' + key + '/status').set(novoStatus);
    mostrarLoading(false);
    const labels = { PENDENTE:'Pendente', CONFIRMADO:'Confirmado', PREPARO:'Em preparo', PRONTO:'Pronto!' };
    toast('✅ Status: ' + labels[novoStatus]);
    fecharModal('modal-pedido');
    enviarEmailStatus(pedidoAberto, novoStatus);
  } catch(e) {
    mostrarLoading(false);
    toast('Erro: ' + e.message, 'err');
  }
}

// ── Filtro e busca ────────────────────────────
function filtrarPedidosNav(filtro) {
  filtroAtual = filtro;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filtro));
  switchTab('pedidos');
  renderPedidos();
}
