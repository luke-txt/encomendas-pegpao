// ══════════════════════════════════════════════
// painel-dono.js — Painel do Dono
// Visão geral, unidades e relatórios
// ══════════════════════════════════════════════

// ── Mostrar painel dono ───────────────────────
function mostrarDono() {
  esconderTudo();
  document.getElementById('dono-screen').style.display = 'flex';
  document.getElementById('dono-sub').textContent  = saudacao();
  document.getElementById('dono-main').innerHTML   = `${saudacao()},<br><em>${currentUser.nome}!</em>`;
  switchDonoTab('geral');
  carregarDonoGeral();
  renderRedeGrid();
}

// ── Tabs do dono ──────────────────────────────
function switchDonoTab(tab) {
  document.querySelectorAll('.dono-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.dono-tab[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.dono-page').forEach(p => p.classList.remove('active'));
  document.getElementById('dp-' + tab)?.classList.add('active');

  if (tab === 'produtos')  carregarProdutosAdmin();
  if (tab === 'relatorio') carregarRelatorio();
}

// ── Visão geral da rede ───────────────────────
async function carregarDonoGeral() {
  const hoje = dataHoje();
  let totalPedidos = 0, pendentes = 0, prontos = 0, faturamento = 0;
  const listaPendentes = [], listaHoje = [];

  for (const pad of PADARIAS) {
    const snap = await db.ref('pedidos/' + pad.id).once('value').catch(() => null);
    if (!snap || !snap.exists()) continue;
    snap.forEach(c => {
      const v = c.val(); if (!v) return;
      totalPedidos++; faturamento += Number(v.total || 0);
      if (v.status === 'PENDENTE') { pendentes++; listaPendentes.push({ ...v, _pad: pad }); }
      if (v.status === 'PRONTO')   prontos++;
      if (v.dataRetirada === hoje && v.status !== 'PRONTO') listaHoje.push({ ...v, _pad: pad });
    });
  }

  // Métricas
  document.getElementById('dono-metrics').innerHTML = `
    <div class="metric-box" style="--m-color:var(--gold)">
      <div class="metric-label">Total pedidos</div>
      <div class="metric-value gold">${totalPedidos}</div>
      <div class="metric-sub">na rede</div>
    </div>
    <div class="metric-box" style="--m-color:var(--amber)">
      <div class="metric-label">Pendentes</div>
      <div class="metric-value amber">${pendentes}</div>
      <div class="metric-sub">aguardando ação</div>
    </div>
    <div class="metric-box" style="--m-color:var(--green)">
      <div class="metric-label">Prontos</div>
      <div class="metric-value green">${prontos}</div>
      <div class="metric-sub">para retirada</div>
    </div>
    <div class="metric-box" style="--m-color:var(--gold)">
      <div class="metric-label">Faturamento</div>
      <div class="metric-value gold" style="font-size:20px">${fmtPreco(faturamento)}</div>
      <div class="metric-sub">total</div>
    </div>`;

  // Pendentes
  const pendEl = document.getElementById('dono-pendentes');
  pendEl.innerHTML = listaPendentes.length
    ? listaPendentes.slice(0, 5).map(p => miniPedidoCard(p)).join('')
    : '<div class="empty-state" style="padding:16px">✅ Nenhum pedido pendente</div>';

  // Hoje
  const hojEl = document.getElementById('dono-hoje');
  hojEl.innerHTML = listaHoje.length
    ? listaHoje.slice(0, 5).map(p => miniPedidoCard(p)).join('')
    : '<div class="empty-state" style="padding:16px">Nenhum pedido com retirada hoje</div>';
}

function miniPedidoCard(p) {
  const stCls   = { PENDENTE:'st-pendente', CONFIRMADO:'st-confirmado', PREPARO:'st-preparo', PRONTO:'st-pronto' }[p.status] || 'st-pendente';
  const stLabel = { PENDENTE:'🕐 Pendente', CONFIRMADO:'✅ Confirmado', PREPARO:'👨‍🍳 Em preparo', PRONTO:'🎉 Pronto!' }[p.status] || p.status;
  const itensTxt = p.itens?.slice(0, 2).map(i => `${i.qty}× ${i.nome}`).join(' · ') || '—';
  const padNome  = p._pad?.nome || p.padariaNome || '—';

  return `
    <div class="pedido-card" style="margin:0 0 10px" onclick="entrarNaPadaria('${p._pad?.id||p.padaria}')">
      <div class="ped-header">
        <div class="ped-num">#${p.num}</div>
        <div class="ped-status ${stCls}">${stLabel}</div>
      </div>
      <div style="font-size:11px;color:var(--gold);font-weight:700;margin-bottom:5px">📍 ${padNome}</div>
      <div class="ped-cliente">${p.clienteNome || '—'}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${itensTxt}</div>
      <div class="ped-footer">
        <div class="ped-total">${fmtPreco(p.total)}</div>
        <div class="ped-data">Retirada: ${fmtData(p.dataRetirada)}</div>
      </div>
    </div>`;
}

// ── Grid de unidades ──────────────────────────
function renderRedeGrid() {
  const grid = document.getElementById('rede-grid');
  if (!grid) return;
  grid.innerHTML = PADARIAS.map((p, i) => `
    <div class="rede-card" onclick="entrarNaPadaria('${p.id}')" style="animation:fadeUp .3s ease ${i*.05}s both">
      <div class="rc-header">
        <div class="rc-ico">${p.ico}</div>
        <div>
          <div class="rc-nome">${p.nome}</div>
          <div class="rc-cidade">${p.cidade}</div>
        </div>
      </div>
      <div class="rc-metrics" id="rcm-${p.id}">
        <div class="rc-m"><div class="rc-m-v" style="color:var(--muted)">—</div><div class="rc-m-l">Pedidos</div></div>
        <div class="rc-m"><div class="rc-m-v" style="color:var(--amber)">—</div><div class="rc-m-l">Pendentes</div></div>
        <div class="rc-m"><div class="rc-m-v" style="color:var(--green)">—</div><div class="rc-m-l">Prontos</div></div>
      </div>
    </div>`).join('');
  PADARIAS.forEach(p => carregarMetricasPadaria(p.id));
}

async function carregarMetricasPadaria(pid) {
  const snap = await db.ref('pedidos/' + pid).once('value').catch(() => null);
  const el   = document.getElementById('rcm-' + pid);
  if (!el) return;
  let total = 0, pend = 0, pront = 0;
  if (snap && snap.exists()) snap.forEach(c => {
    const v = c.val(); if (!v) return;
    total++;
    if (v.status === 'PENDENTE') pend++;
    if (v.status === 'PRONTO')   pront++;
  });
  el.innerHTML = `
    <div class="rc-m"><div class="rc-m-v" style="color:var(--gold)">${total}</div><div class="rc-m-l">Pedidos</div></div>
    <div class="rc-m"><div class="rc-m-v" style="color:var(--amber)">${pend}</div><div class="rc-m-l">Pendentes</div></div>
    <div class="rc-m"><div class="rc-m-v" style="color:var(--green)">${pront}</div><div class="rc-m-l">Prontos</div></div>`;
}

function entrarNaPadaria(pid) {
  document.getElementById('dono-screen').style.display = 'none';
  mostrarApp(pid);
}

// ── Relatórios ────────────────────────────────
async function carregarRelatorio() {
  let total = 0, faturamento = 0, pendentes = 0;
  const porPadaria = {}, porProduto = {};

  for (const pad of PADARIAS) {
    const snap = await db.ref('pedidos/' + pad.id).once('value').catch(() => null);
    if (!snap || !snap.exists()) continue;
    porPadaria[pad.id] = { nome:pad.nome, ico:pad.ico, total:0, faturamento:0 };
    snap.forEach(c => {
      const v = c.val(); if (!v) return;
      total++; faturamento += Number(v.total || 0);
      porPadaria[pad.id].total++;
      porPadaria[pad.id].faturamento += Number(v.total || 0);
      if (v.status === 'PENDENTE') pendentes++;
      v.itens?.forEach(i => {
        if (!porProduto[i.nome]) porProduto[i.nome] = { qty:0 };
        porProduto[i.nome].qty += i.qty || 1;
      });
    });
  }

  document.getElementById('rel-metrics').innerHTML = `
    <div class="metric-box" style="--m-color:var(--gold)">
      <div class="metric-label">Total pedidos</div>
      <div class="metric-value gold">${total}</div>
    </div>
    <div class="metric-box" style="--m-color:var(--green)">
      <div class="metric-label">Faturamento</div>
      <div class="metric-value green" style="font-size:18px">${fmtPreco(faturamento)}</div>
    </div>
    <div class="metric-box" style="--m-color:var(--amber)">
      <div class="metric-label">Pendentes</div>
      <div class="metric-value amber">${pendentes}</div>
    </div>
    <div class="metric-box" style="--m-color:var(--blue)">
      <div class="metric-label">Unidades</div>
      <div class="metric-value blue">${PADARIAS.length}</div>
    </div>`;

  // Por padaria
  const sortPad = Object.values(porPadaria).sort((a,b) => b.total - a.total);
  document.getElementById('rel-por-padaria').innerHTML = sortPad.map(p => `
    <div class="pedido-card" style="margin:0 0 8px;cursor:default">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:14px;font-weight:700;font-family:var(--ff-display)">${p.ico||'🏪'} ${p.nome}</div>
        <div style="font-family:var(--ff-mono);color:var(--gold);font-size:14px">${fmtPreco(p.faturamento)}</div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${p.total} pedido${p.total!==1?'s':''}</div>
    </div>`).join('') || '<div class="empty-state">Sem dados</div>';

  // Produtos mais pedidos
  const sortProd = Object.entries(porProduto).sort((a,b) => b[1].qty - a[1].qty).slice(0,10);
  const maxQ = sortProd[0]?.[1]?.qty || 1;
  document.getElementById('rel-produtos').innerHTML = sortProd.map(([nome,d],i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-family:var(--ff-mono);font-size:12px;color:var(--muted);width:20px">${i+1}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;margin-bottom:5px">${nome}</div>
        <div style="background:var(--surface3);border-radius:3px;height:4px;overflow:hidden">
          <div style="height:100%;width:${(d.qty/maxQ*100).toFixed(0)}%;background:var(--gold);border-radius:3px"></div>
        </div>
      </div>
      <div style="font-family:var(--ff-mono);font-size:13px;font-weight:500;color:var(--gold)">${d.qty}</div>
    </div>`).join('') || '<div class="empty-state">Sem dados</div>';
}
