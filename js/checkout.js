// ══════════════════════════════════════════════
// checkout.js — Fluxo CEP → Auth → Pagamento
// Mercado Pago: Pix + Cartão Crédito + Débito
// ══════════════════════════════════════════════

let padariaEscolhida = null;
let pagAtivo = 'pix';

// ── Iniciar checkout ──────────────────────────
function iniciarCheckout() {
  if (!carrinho.length) return;
  fecharCarrinho();
  irStep('step-cep');
  document.getElementById('cep-result').style.display = 'none';
  document.getElementById('cep-erro').style.display   = 'none';
  document.getElementById('inp-cep').value = '';
  abrirModal('modal-cep');
}

function fecharCheckout() {
  fecharModal('modal-cep');
  setTimeout(() => irStep('step-cep'), 300);
}

function irStep(id) {
  document.querySelectorAll('.cep-step').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ── CEP ───────────────────────────────────────
async function buscarCEP() {
  const cep = document.getElementById('inp-cep')?.value.replace(/\D/g, '');
  if (!cep || cep.length !== 8) { erroCep('CEP inválido. Digite 8 dígitos.'); return; }

  mostrarLoading(true);
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) { mostrarLoading(false); erroCep('CEP não encontrado.'); return; }

    const q   = encodeURIComponent(`${data.logradouro||''} ${data.localidade} ${data.uf} Brasil`.trim());
    const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
    const gd  = await geo.json();

    mostrarLoading(false);
    if (!gd.length) { erroCep('Não conseguimos localizar esse CEP. Tente outro.'); return; }

    const lat = parseFloat(gd[0].lat), lng = parseFloat(gd[0].lon);
    padariaEscolhida = padariaMaisProxima(lat, lng);

    // Exibe resultado
    document.getElementById('pr-nome').textContent = padariaEscolhida.nome;
    document.getElementById('pr-end').textContent  = padariaEscolhida.endereco;
    document.getElementById('pr-dist').textContent = `📍 ${padariaEscolhida._dist.toFixed(1)} km de ${data.localidade}/${data.uf}`;
    document.getElementById('pr-data-val').textContent = dataRetiranda();
    document.getElementById('cep-result').style.display = 'block';
    document.getElementById('cep-erro').style.display   = 'none';

  } catch(e) {
    mostrarLoading(false);
    erroCep('Erro de conexão. Verifique sua internet.');
  }
}

function erroCep(msg) {
  const el = document.getElementById('cep-erro');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  document.getElementById('cep-result').style.display = 'none';
}

// ── Confirmar padaria → próximo passo ─────────
document.addEventListener('DOMContentLoaded', () => {

  // CEP mask
  document.getElementById('inp-cep')?.addEventListener('input', function() {
    let v = this.value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
    this.value = v;
  });
  document.getElementById('inp-cep')?.addEventListener('keydown', e => { if (e.key === 'Enter') buscarCEP(); });
  document.getElementById('btn-buscar-cep')?.addEventListener('click', buscarCEP);

  document.getElementById('btn-confirmar-padaria')?.addEventListener('click', () => {
    if (!padariaEscolhida) return;
    if (currentUser) { irStep('step-pagamento'); preencherResumo(); }
    else             { irStep('step-auth'); }
  });

  // Auth dentro do checkout
  document.getElementById('btn-co-login')?.addEventListener('click', async () => {
    const ok = await loginEmail(
      document.getElementById('co-login-email').value,
      document.getElementById('co-login-pass').value,
      'co-login-erro'
    );
    if (ok) { irStep('step-pagamento'); preencherResumo(); }
  });

  document.getElementById('btn-co-google')?.addEventListener('click', async () => {
    await loginGoogle();
    if (currentUser) { irStep('step-pagamento'); preencherResumo(); }
  });

  document.getElementById('btn-co-cadastro')?.addEventListener('click', async () => {
    const ok = await cadastrarEmail(
      document.getElementById('co-cad-nome').value,
      document.getElementById('co-cad-nasc').value,
      document.getElementById('co-cad-email').value,
      document.getElementById('co-cad-pass').value,
      document.getElementById('co-cad-pass2').value,
      'co-cad-erro'
    );
    if (ok) { irStep('step-pagamento'); preencherResumo(); }
  });

  // Auth modal (header)
  document.getElementById('btn-auth-login')?.addEventListener('click', async () => {
    const ok = await loginEmail(
      document.getElementById('auth-login-email').value,
      document.getElementById('auth-login-pass').value,
      'auth-login-erro'
    );
    if (ok) { fecharModal('modal-auth'); toast('Bem-vindo(a) de volta! 👋'); }
  });

  document.getElementById('btn-auth-google')?.addEventListener('click', async () => {
    await loginGoogle();
    if (currentUser) fecharModal('modal-auth');
  });

  document.getElementById('btn-auth-cadastro')?.addEventListener('click', async () => {
    const ok = await cadastrarEmail(
      document.getElementById('auth-cad-nome').value,
      document.getElementById('auth-cad-nasc').value,
      document.getElementById('auth-cad-email').value,
      document.getElementById('auth-cad-pass').value,
      document.getElementById('auth-cad-pass2').value,
      'auth-cad-erro'
    );
    if (ok) { fecharModal('modal-auth'); toast('Conta criada! Bem-vindo(a)! 🎉'); }
  });

  // Confirmar pedido
  document.getElementById('btn-confirmar-pedido')?.addEventListener('click', confirmarPedido);
});

// ── Preencher resumo ──────────────────────────
function preencherResumo() {
  const total = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);

  document.getElementById('resumo-itens').innerHTML = carrinho.map(i => `
    <div class="resumo-item">
      <span>${i.qty}× ${i.nome}${i.sabor ? ` (${i.sabor})` : ''}${i.obs ? ` <small style="color:var(--muted)">"${i.obs}"</small>` : ''}</span>
      <span>${fmtPreco(i.preco * i.qty)}</span>
    </div>`).join('');

  document.getElementById('resumo-total').textContent = fmtPreco(total);

  // Mercado Pago: inicia brick de pagamento
  iniciarMercadoPago(total);
}

// ── Mercado Pago ──────────────────────────────
async function iniciarMercadoPago(total) {
  const container = document.getElementById('mp-brick-container');
  if (!container) return;
  container.innerHTML = '<div class="mp-loading">Carregando opções de pagamento...</div>';

  // Verifica se o SDK foi carregado
  if (typeof MercadoPago === 'undefined') {
    container.innerHTML = `
      <div class="mp-fallback">
        <p style="font-size:13px;color:var(--muted);margin-bottom:12px">
          Pagamento online temporariamente indisponível.<br>
          Use a chave Pix abaixo.
        </p>
        ${renderPixManual()}
      </div>`;
    return;
  }

  try {
    const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });

    // Cria preferência de pagamento via Firebase Function ou backend
    // Por enquanto mostra as opções manualmente
    container.innerHTML = `
      <div class="mp-tabs">
        <button class="mp-tab active" onclick="switchPagTab('pix')">🟢 Pix</button>
        <button class="mp-tab" onclick="switchPagTab('credito')">💳 Crédito</button>
        <button class="mp-tab" onclick="switchPagTab('debito')">🏦 Débito</button>
      </div>
      <div class="mp-panel active" id="mp-pix">
        ${renderPixManual()}
      </div>
      <div class="mp-panel" id="mp-credito">
        <div class="mp-link-box">
          <div class="mp-link-ico">💳</div>
          <p class="mp-link-txt">Após confirmar o pedido, você receberá um <b>link de pagamento</b> por e-mail para pagar com cartão de crédito em até 12x.</p>
        </div>
      </div>
      <div class="mp-panel" id="mp-debito">
        <div class="mp-link-box">
          <div class="mp-link-ico">🏦</div>
          <p class="mp-link-txt">Após confirmar, você receberá um <b>link de pagamento</b> por e-mail para pagar com cartão de débito.</p>
        </div>
      </div>`;

    pagAtivo = 'pix';

  } catch(e) {
    container.innerHTML = renderPixManual();
  }
}

function renderPixManual() {
  return `
    <div class="pix-chave">
      <div class="pix-chave-val" id="pix-chave-val">${PIX_CHAVE}</div>
      <button class="pix-copy" onclick="copiarPix()">Copiar</button>
    </div>
    <p class="pix-info">Após confirmar o pedido, realize o Pix para a chave acima e aguarde a confirmação por e-mail.</p>`;
}

function switchPagTab(tab) {
  pagAtivo = tab;
  document.querySelectorAll('.mp-tab').forEach((t, i) =>
    t.classList.toggle('active', ['pix','credito','debito'][i] === tab));
  document.querySelectorAll('.mp-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mp-' + tab)?.classList.add('active');
}

function copiarPix() {
  navigator.clipboard.writeText(PIX_CHAVE).then(() => toast('✅ Chave Pix copiada!'));
}

// ── Confirmar pedido ──────────────────────────
async function confirmarPedido() {
  if (!currentUser || !padariaEscolhida) return;

  mostrarLoading(true);
  const total = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
  const num   = 'PEG' + Date.now().toString().slice(-6);

  const pedido = {
    num,
    clienteUid:   currentUser.uid,
    clienteNome:  currentUser.displayName || currentUser.email.split('@')[0],
    clienteEmail: currentUser.email,
    padaria:      padariaEscolhida.id,
    padariaNome:  padariaEscolhida.nome,
    itens: carrinho.map(i => ({
      id: i.id, nome: i.nome, qty: i.qty,
      preco: i.preco, obs: i.obs || '',
      sabor: i.sabor || ''
    })),
    total,
    pagamento:    pagAtivo,
    status:       'PENDENTE',
    dataRetirada: dataRetiradaISO(),
    criadoEm:     Date.now()
  };

  try {
    await db.ref('pedidos/' + padariaEscolhida.id + '/' + num).set(pedido);
    await db.ref('pedidos_cliente/' + currentUser.uid + '/' + num).set(pedido);

    mostrarLoading(false);

    // Confirmação
    document.getElementById('pc-num-val').textContent     = num;
    document.getElementById('pc-retirada-val').textContent =
      dataRetiranda() + '\n📍 ' + padariaEscolhida.nome;

    irStep('step-confirmado');

    // Limpa carrinho
    carrinho = [];
    atualizarCarrinho();

    // Se crédito/débito → gera link MP
    if (pagAtivo !== 'pix') gerarLinkPagamento(pedido);

    // E-mail confirmação
    enviarEmailPedido(pedido);

  } catch(e) {
    mostrarLoading(false);
    const er = document.getElementById('pag-erro');
    if (er) { er.textContent = 'Erro ao registrar pedido. Tente novamente.'; er.style.display = 'block'; }
  }
}

// ── Link de pagamento Mercado Pago ────────────
async function gerarLinkPagamento(pedido) {
  // Para gerar links do Mercado Pago você precisa de um backend/Firebase Function
  // que chame a API do MP com suas credenciais privadas.
  // O link é então enviado por e-mail ao cliente.
  // Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
  console.log('[MP] Gerar link de pagamento para pedido:', pedido.num, '- Total:', fmtPreco(pedido.total));
  // Exemplo de como seria com um backend:
  // const res = await fetch('/api/criar-pagamento', { method:'POST', body: JSON.stringify(pedido) });
  // const { link } = await res.json();
  // window.open(link); // ou envia por e-mail
}

// ── E-mail ────────────────────────────────────
function enviarEmailPedido(pedido) {
  // Configure no emailjs.com e descomente:
  // emailjs.send('SERVICE_ID','TEMPLATE_PEDIDO',{
  //   to_email: pedido.clienteEmail, to_name: pedido.clienteNome,
  //   pedido_num: pedido.num, padaria: pedido.padariaNome,
  //   data_retirada: fmtData(pedido.dataRetirada),
  //   total: fmtPreco(pedido.total),
  //   pagamento: pedido.pagamento,
  //   itens: pedido.itens.map(i=>`${i.qty}x ${i.nome}${i.sabor?' ('+i.sabor+')':''}`).join(', ')
  // },'PUBLIC_KEY');
  console.log('[Email] Pedido', pedido.num, '→', pedido.clienteEmail);
}
