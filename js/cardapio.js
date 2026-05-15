// ══════════════════════════════════════════════
// cardapio.js — Cardápio com imagem, sabores e qtd
// ══════════════════════════════════════════════

let produtos = [];
let catAtiva = 'todos';

// ── Carrega produtos do Firebase ──────────────
async function carregarProdutos() {
  try {
    const snap = await db.ref('produtos').orderByChild('ordem').once('value');
    produtos = [];
    if (snap.exists()) {
      snap.forEach(c => {
        const v = c.val();
        if (v && v.ativo !== false) produtos.push({ id: c.key, ...v });
      });
    }
    if (!produtos.length) produtos = PRODUTOS_DEFAULT.map(p => ({ ...p, ativo: true }));
  } catch(e) {
    produtos = PRODUTOS_DEFAULT.map(p => ({ ...p, ativo: true }));
  }
  renderProdutos();
}

// ── Renderiza grid de produtos ────────────────
function renderProdutos() {
  const grid = document.getElementById('produtos-grid');
  if (!grid) return;

  const lista = catAtiva === 'todos'
    ? produtos
    : produtos.filter(p => p.cat === catAtiva);

  if (!lista.length) {
    grid.innerHTML = '<div class="empty-cat">Nenhum produto nesta categoria.</div>';
    return;
  }

  grid.innerHTML = lista.map(p => produtoCardHTML(p)).join('');
}

function produtoCardHTML(p) {
  const temSabores = p.sabores && p.sabores.length > 0;
  const qtdMin     = p.qtdMin || 1;
  const catInfo    = CATEGORIAS[p.cat] || { label: p.cat, ico: '🎂' };

  // Imagem ou emoji
  const imgHTML = p.imagem
    ? `<img src="${p.imagem}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const emojiHTML = `<span style="${p.imagem ? 'display:none' : ''}">${p.ico || '🎂'}</span>`;

  // Sabores
  const saboresHTML = temSabores ? `
    <div class="produto-sabores">
      <label>Sabor</label>
      <select id="sabor-${p.id}" class="select-sabor">
        <option value="">Selecione o sabor...</option>
        ${p.sabores.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>` : '';

  // Quantidade
  const qtdHTML = `
    <div class="produto-qtd">
      <label>Quantidade ${qtdMin > 1 ? `<span class="qtd-min-badge">mín. ${qtdMin}</span>` : ''}</label>
      <div class="qtd-control">
        <button class="qtd-btn" onclick="alterarQtd('${p.id}', -1, ${qtdMin})">−</button>
        <span class="qtd-display" id="qtd-${p.id}">${qtdMin}</span>
        <button class="qtd-btn" onclick="alterarQtd('${p.id}', 1, ${qtdMin})">+</button>
      </div>
    </div>`;

  return `
    <div class="produto-card" id="pc-${p.id}">
      <div class="produto-img">
        ${imgHTML}${emojiHTML}
        <div class="produto-cat-tag">${catInfo.ico} ${catInfo.label}</div>
      </div>
      <div class="produto-body">
        <div class="produto-nome">${p.nome}</div>
        <div class="produto-desc">${p.desc || ''}</div>
        ${saboresHTML}
        ${qtdHTML}
        <div class="produto-obs">
          <input type="text" id="obs-${p.id}" placeholder="Observações: dedicatória, restrições...">
        </div>
        <div class="produto-footer">
          <div class="produto-preco">${fmtPreco(p.preco)} <small>/ unidade</small></div>
          <button class="btn-add" onclick="addCard('${p.id}')">+ Pedir</button>
        </div>
      </div>
    </div>`;
}

// ── Controle de quantidade ────────────────────
function alterarQtd(id, delta, min) {
  const el  = document.getElementById('qtd-' + id);
  if (!el) return;
  const cur = parseInt(el.textContent) || min;
  const novo = Math.max(min, cur + delta);
  el.textContent = novo;
}

// ── Adicionar ao carrinho ─────────────────────
function addCard(id) {
  const p      = produtos.find(x => x.id === id);
  if (!p) return;
  const qtd    = parseInt(document.getElementById('qtd-' + id)?.textContent) || (p.qtdMin || 1);
  const obs    = document.getElementById('obs-' + id)?.value.trim() || '';
  const sabor  = document.getElementById('sabor-' + id)?.value || '';

  if (p.sabores && p.sabores.length > 0 && !sabor) {
    toast('Selecione o sabor antes de adicionar.', 'warn');
    document.getElementById('sabor-' + id)?.focus();
    return;
  }

  adicionarAoCarrinho(id, obs, qtd, sabor);
}

// ── Filtro de categorias ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const catFilter = document.getElementById('cat-filter');
  if (catFilter) {
    catFilter.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      catAtiva = btn.dataset.cat;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProdutos();
    });
  }
  carregarProdutos();
});
