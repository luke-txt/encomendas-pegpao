// ══════════════════════════════════════════════
// carrinho.js — Carrinho de compras
// ══════════════════════════════════════════════

let carrinho = [];

// ── Adicionar ─────────────────────────────────
function adicionarAoCarrinho(id, obs, qtd, sabor) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;

  const chave = id + '|' + (sabor || '') + '|' + (obs || '');
  const existe = carrinho.find(i => i._chave === chave);

  if (existe) {
    existe.qty += qtd;
  } else {
    carrinho.push({
      _chave: chave,
      id, nome: p.nome, ico: p.ico || '🎂',
      preco: p.preco, imagem: p.imagem || null,
      qty: qtd, obs, sabor,
      qtdMin: p.qtdMin || 1
    });
  }

  atualizarCarrinho();
  toast('✅ ' + p.nome + ' adicionado!');

  // Pulsa ícone do carrinho
  const btn = document.getElementById('cart-btn');
  if (btn) {
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 200);
  }
}

// ── Remover / diminuir ────────────────────────
function removerDoCarrinho(chave) {
  const idx = carrinho.findIndex(i => i._chave === chave);
  if (idx === -1) return;
  const item = carrinho[idx];
  if (item.qty > item.qtdMin) {
    item.qty -= item.qtdMin;
  } else {
    carrinho.splice(idx, 1);
  }
  atualizarCarrinho();
}

function aumentarCarrinho(chave) {
  const item = carrinho.find(i => i._chave === chave);
  if (!item) return;
  item.qty += item.qtdMin || 1;
  atualizarCarrinho();
}

// ── Atualizar UI ──────────────────────────────
function atualizarCarrinho() {
  const total = carrinho.reduce((s, i) => s + i.preco * i.qty, 0);
  const count = carrinho.reduce((s, i) => s + i.qty, 0);

  // Badge
  const countEl = document.getElementById('cart-count');
  if (countEl) { countEl.textContent = count; countEl.classList.toggle('show', count > 0); }

  // Total
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = fmtPreco(total);

  // Botão checkout
  const checkoutBtn = document.getElementById('btn-checkout');
  if (checkoutBtn) checkoutBtn.disabled = count === 0;

  // Render itens
  renderCarrinhoItens();
}

function renderCarrinhoItens() {
  const body = document.getElementById('cart-body');
  if (!body) return;

  if (!carrinho.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-ico">🛒</div>
        <div class="cart-empty-title">Carrinho vazio</div>
        <div class="cart-empty-sub">Adicione produtos do cardápio</div>
      </div>`;
    return;
  }

  body.innerHTML = carrinho.map(item => {
    const chave = item._chave.replace(/'/g, "\\'");
    const imgHTML = item.imagem
      ? `<img src="${item.imagem}" style="width:100%;height:100%;object-fit:cover;border-radius:10px" onerror="this.style.display='none'">`
      : item.ico;
    return `
      <div class="cart-item">
        <div class="ci-ico">${imgHTML}</div>
        <div class="ci-info">
          <div class="ci-nome">${item.nome}</div>
          ${item.sabor ? `<div class="ci-obs">🍫 ${item.sabor}</div>` : ''}
          ${item.obs   ? `<div class="ci-obs">"${item.obs}"</div>`    : ''}
          <div class="ci-footer">
            <div class="ci-preco">${fmtPreco(item.preco * item.qty)}</div>
            <div class="ci-qty">
              <button class="qty-btn" onclick="removerDoCarrinho('${chave}')">−</button>
              <div class="qty-num">${item.qty}</div>
              <button class="qty-btn" onclick="aumentarCarrinho('${chave}')">+</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Abrir / fechar ────────────────────────────
function abrirCarrinho() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('drawer-bg')?.classList.add('open');
}
function fecharCarrinho() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('drawer-bg')?.classList.remove('open');
}
