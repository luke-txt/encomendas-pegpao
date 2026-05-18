// ══════════════════════════════════════════════
// checkout.js — Fluxo CEP → Auth → Pagamento
// Asaas: link de pagamento único (sem abas)
// ══════════════════════════════════════════════

let padariaEscolhida = null;

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

    document.getElementById('pr-nome').textContent    = padariaEscolhida.nome;
    document.getElementById('pr-end').textContent     = padariaEscolhida.endereco;
    document.getElementById('pr-dist').textContent    = `📍 ${padariaEscolhida._dist.toFixed(1)} km de ${data.localidade}/${data.uf}`;
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

// ── Eventos DOMContentLoaded ──────────────────
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

  // Renderiza área de pagamento — apenas informativo, sem abas
  const container = document.getElementById('mp-brick-container');
  if (container) {
    container.innerHTML = `
      <div style="
        background: var(--bg2, #f5f5f5);
        border: 1px solid var(--border, #ddd);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        color: var(--muted, #666);
        font-size: 13px;
        line-height: 1.6;
      ">
        <div style="font-size: 28px; margin-bottom: 8px;">🔒</div>
        <strong style="color: var(--text, #333); font-size: 14px;">Pagamento seguro via Asaas</strong><br>
        Pix, cartão de crédito ou boleto.<br>
        Você será redirecionado ao clicar em <strong>Confirmar Pedido</strong>.
      </div>`;
  }
}

// ── Confirmar pedido → salva no Firebase → chama Asaas → redireciona ──
async function confirmarPedido() {
  if (!currentUser || !padariaEscolhida) return;

  const btnConfirmar = document.getElementById('btn-confirmar-pedido');
  if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = 'Processando...'; }

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
    pagamento:    'asaas',
    status:       'PENDENTE',
    dataRetirada: dataRetiradaISO(),
    criadoEm:     Date.now()
  };

  try {
    // 1. Salva pedido no Firebase nas coleções originais
    await db.ref('pedidos/' + padariaEscolhida.id + '/' + num).set(pedido);
    await db.ref('pedidos_cliente/' + currentUser.uid + '/' + num).set(pedido);


    // 2. Gera link de pagamento no Asaas
    const linkPagamento = await gerarLinkAsaas(pedido);

    mostrarLoading(false);

    if (linkPagamento) {
      // 3. Limpa carrinho
      carrinho = [];
      atualizarCarrinho();

      // 4. E-mail de confirmação (opcional)
      enviarEmailPedido(pedido);

      // 5. Redireciona para o link de pagamento do Asaas
      window.location.href = linkPagamento;

    } else {
      // Asaas falhou — mostra step de confirmação mesmo assim
      carrinho = [];
      atualizarCarrinho();
      enviarEmailPedido(pedido);

      document.getElementById('pc-num-val').textContent      = num;
      document.getElementById('pc-retirada-val').textContent =
        dataRetiranda() + '\n📍 ' + padariaEscolhida.nome;
      irStep('step-confirmado');

      toast('⚠️ Pedido salvo! O link de pagamento será enviado por e-mail.');
    }

  } catch(e) {
    console.error('[confirmarPedido]', e);
    mostrarLoading(false);
    const er = document.getElementById('pag-erro');
    if (er) { er.textContent = 'Erro ao registrar pedido. Tente novamente.'; er.style.display = 'block'; }
  } finally {
    if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Confirmar Pedido'; }
  }
}

// ── Gera link Asaas via /api/asaas-pagamento ──
async function gerarLinkAsaas(pedido) {
  try {
    const res = await fetch('/api/asaas-pagamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numeroPedido: pedido.num,
        total:        pedido.total,
        clienteEmail: pedido.clienteEmail,
        clienteNome:  pedido.clienteNome,
        dataRetirada: pedido.dataRetirada,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Asaas] Erro na API:', data);
      return null;
    }

    // Salva o ID da cobrança no Firebase para rastrear webhook
    await db.ref('pedidos/' + pedido.padaria + '/' + pedido.num + '/asaasId').set(data.cobrancaId);
    await db.ref('pedidos_cliente/' + pedido.clienteUid + '/' + pedido.num + '/asaasId').set(data.cobrancaId);

    return data.linkPagamento; 

  } catch(e) {
    console.error('[gerarLinkAsaas] Exception:', e);
    return null;
  }
}

// ── E-mail ────────────────────────────────────
function enviarEmailPedido(pedido) {
  console.log('[Email] Pedido', pedido.num, '→', pedido.clienteEmail);
}
