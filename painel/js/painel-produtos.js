// ══════════════════════════════════════════════
// painel-produtos.js — Gestão completa de produtos
// Upload de imagem via Firebase Storage
// ══════════════════════════════════════════════

let prodCatAtiva = 'todos';
let saboresTemp  = [];
let imgUploadFile = null;

// ── Carrega e renderiza ───────────────────────
async function carregarProdutosAdmin() {
  const lista = document.getElementById('lista-produtos-admin');
  if (!lista) return;
  lista.innerHTML = '<div class="empty-state">Carregando...</div>';

  const snap = await db.ref('produtos').orderByChild('ordem').once('value').catch(() => null);
  let prods = [];
  if (snap && snap.exists()) {
    snap.forEach(c => { const v = c.val(); if (v) prods.push({ id:c.key, ...v }); });
  }
  if (!prods.length) { lista.innerHTML = '<div class="empty-state">Nenhum produto cadastrado ainda.<br>Clique em "+ Novo produto" para começar.</div>'; return; }

  const filtrados = prodCatAtiva === 'todos' ? prods : prods.filter(p => p.cat === prodCatAtiva);
  if (!filtrados.length) { lista.innerHTML = '<div class="empty-state">Nenhum produto nesta categoria.</div>'; return; }

  lista.innerHTML = filtrados.map(p => prodAdminCardHTML(p)).join('');
}

function prodAdminCardHTML(p) {
  const ativo = p.ativo !== false;
  const imgHTML = p.imagem
    ? `<img src="${p.imagem}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
    : `<span>${p.ico || '🎂'}</span>`;

  return `
    <div class="produto-admin-card" id="pac-${p.id}">
      <div class="pa-img">
        ${imgHTML}
        ${!ativo ? '<div class="inactive-overlay">Inativo</div>' : ''}
      </div>
      <div class="pa-body">
        <div class="pa-nome">${p.nome}</div>
        <div class="pa-cat">${catLabel(p.cat)} ${p.destaque ? '⭐' : ''}</div>
        <div class="pa-meta">
          <span class="pa-preco">${fmtPreco(p.preco)}</span>
          ${p.qtdMultiplo > 1 ? `<span class="pa-qtdmin">lote: ${p.qtdMultiplo} un.</span>` : ''}
          ${p.qtdMin > 1 ? `<span class="pa-qtdmin">mín. ${p.qtdMin}</span>` : ''}
          ${p.sabores?.length ? `<span class="pa-qtdmin">${p.sabores.length} sabores</span>` : ''}
        </div>
      </div>
      <div class="pa-actions">
        <div class="pa-toggle ${ativo ? 'on' : ''}" onclick="toggleProduto('${p.id}', ${ativo})" title="${ativo ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}"></div>
        <button class="pa-btn" onclick="editarProduto('${p.id}')" title="Editar">✏️</button>
        <button class="pa-btn del" onclick="deletarProduto('${p.id}', '${(p.nome||'').replace(/'/g,"\\'")}', '${p.imagem||''}')" title="Deletar">🗑️</button>
      </div>
    </div>`;
}

function catLabel(cat) {
  return { bolos:'🎂 Bolos', 'bolos-confeitados':'✨ Confeitados', baguetes:'🥖 Baguetes', docinhos:'🍬 Docinhos', salgados:'🥟 Salgados', assados:'🥘 Assados' }[cat] || cat;
}

// ── Abrir modal novo produto ──────────────────
function abrirModalProduto(id) {
  saboresTemp = [];
  imgUploadFile = null;
  document.getElementById('modal-prod-title').textContent = '🎂 Novo produto';
  document.getElementById('prod-edit-id').value   = '';
  document.getElementById('prod-nome').value      = '';
  document.getElementById('prod-cat').value       = 'bolos';
  document.getElementById('prod-ico').value       = '🎂';
  document.getElementById('prod-preco').value     = '';
  document.getElementById('prod-qtdmin').value    = '1';
  document.getElementById('prod-qtdmultiplo').value = '1';
  document.getElementById('prod-desc').value      = '';
  document.getElementById('prod-imagem-url').value = '';
  document.getElementById('prod-ativo').checked   = true;
  document.getElementById('prod-destaque').checked = false;
  document.getElementById('img-upload-progress').style.display = 'none';
  renderImgPreview(null);
  renderSabores();
  abrirModal('modal-produto');
}

// ── Editar produto existente ──────────────────
async function editarProduto(id) {
  const snap = await db.ref('produtos/' + id).once('value');
  const v    = snap.val();
  if (!v) { toast('Produto não encontrado.', 'err'); return; }

  saboresTemp   = v.sabores ? [...v.sabores] : [];
  imgUploadFile = null;

  document.getElementById('modal-prod-title').textContent = '✏️ Editar produto';
  document.getElementById('prod-edit-id').value    = id;
  document.getElementById('prod-nome').value       = v.nome || '';
  document.getElementById('prod-cat').value        = v.cat  || 'bolos';
  document.getElementById('prod-ico').value        = v.ico  || '🎂';
  document.getElementById('prod-preco').value      = v.preco || '';
  document.getElementById('prod-qtdmin').value      = v.qtdMin || 1;
  document.getElementById('prod-qtdmultiplo').value  = v.qtdMultiplo || 1;
  document.getElementById('prod-desc').value       = v.desc || '';
  document.getElementById('prod-imagem-url').value = v.imagem || '';
  document.getElementById('prod-ativo').checked    = v.ativo !== false;
  document.getElementById('prod-destaque').checked = v.destaque === true;
  document.getElementById('img-upload-progress').style.display = 'none';

  renderImgPreview(v.imagem || null);
  renderSabores();
  abrirModal('modal-produto');
}

// ── Preview da imagem ─────────────────────────
function renderImgPreview(url) {
  const preview = document.getElementById('img-preview');
  if (url) {
    preview.innerHTML = `
      <img src="${url}" style="width:100%;max-height:200px;object-fit:cover;display:block" onerror="this.style.display='none'">
      <div class="img-change-btn">📷 Alterar foto</div>`;
  } else {
    preview.innerHTML = `
      <div class="img-upload-placeholder">
        <div style="font-size:32px;margin-bottom:8px">📷</div>
        <div style="font-size:13px;font-weight:600;color:var(--text2)">Adicionar foto</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">JPG, PNG até 2MB</div>
      </div>`;
  }
}

// ── Upload de imagem ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prod-img-input')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Imagem muito grande. Máximo 2MB.', 'err'); return; }
    if (!file.type.startsWith('image/')) { toast('Selecione uma imagem válida.', 'err'); return; }
    imgUploadFile = file;

    // Preview local
    const reader = new FileReader();
    reader.onload = e => renderImgPreview(e.target.result);
    reader.readAsDataURL(file);
  });
});

async function uploadImagem(file, prodId) {
  const progress = document.getElementById('img-upload-progress');
  const bar      = document.getElementById('upload-bar-fill');
  const pct      = document.getElementById('upload-pct');
  progress.style.display = 'block';

  return new Promise((resolve, reject) => {
    const ref  = storage.ref('produtos/' + prodId + '.' + file.name.split('.').pop());
    const task = ref.put(file);

    task.on('state_changed',
      snap => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        bar.style.width = p + '%';
        pct.textContent = p + '%';
      },
      err => { progress.style.display = 'none'; reject(err); },
      async () => {
        const url = await task.snapshot.ref.getDownloadURL();
        progress.style.display = 'none';
        resolve(url);
      }
    );
  });
}

// ── Sabores ───────────────────────────────────
function renderSabores() {
  const lista = document.getElementById('sabores-list');
  if (!lista) return;
  lista.innerHTML = saboresTemp.map((s, i) => `
    <div class="sabor-tag">
      <span>${s}</span>
      <button onclick="removerSabor(${i})">✕</button>
    </div>`).join('') || '<span style="font-size:11px;color:var(--muted)">Nenhum sabor adicionado</span>';
}

function adicionarSabor() {
  const inp = document.getElementById('sabor-input');
  const val = inp.value.trim();
  if (!val) return;
  if (saboresTemp.includes(val)) { toast('Sabor já adicionado.', 'warn'); return; }
  saboresTemp.push(val);
  inp.value = '';
  renderSabores();
}

function removerSabor(i) {
  saboresTemp.splice(i, 1);
  renderSabores();
}

// ── Salvar produto ────────────────────────────
async function salvarProduto() {
  const nome   = document.getElementById('prod-nome').value.trim();
  const preco  = parseFloat(document.getElementById('prod-preco').value);
  const qtdMin = parseInt(document.getElementById('prod-qtdmin').value) || 1;

  if (!nome)                       { toast('Informe o nome.', 'err'); return; }
  if (isNaN(preco) || preco < 0)   { toast('Preço inválido.', 'err'); return; }

  mostrarLoading(true);

  let editId = document.getElementById('prod-edit-id').value;
  const prodId = editId || nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString().slice(-4);

  let imagemUrl = document.getElementById('prod-imagem-url').value || '';

  // Upload se tiver nova imagem
  if (imgUploadFile) {
    try {
      imagemUrl = await uploadImagem(imgUploadFile, prodId);
    } catch(e) {
      mostrarLoading(false);
      toast('Erro no upload da imagem: ' + e.message, 'err');
      return;
    }
  }

  const dados = {
    nome,
    cat:       document.getElementById('prod-cat').value,
    ico:       document.getElementById('prod-ico').value || '🎂',
    preco,
    qtdMin,
    qtdMultiplo: parseInt(document.getElementById('prod-qtdmultiplo').value) || 1,
    desc:      document.getElementById('prod-desc').value.trim(),
    ativo:     document.getElementById('prod-ativo').checked,
    destaque:  document.getElementById('prod-destaque').checked,
    sabores:   saboresTemp.length ? saboresTemp : null,
    imagem:    imagemUrl || null,
    updatedAt: Date.now()
  };
  if (!editId) dados.createdAt = Date.now();

  await db.ref('produtos/' + prodId).update(dados).catch(e => {
    mostrarLoading(false); toast('Erro: ' + e.message, 'err');
  });

  mostrarLoading(false);
  toast('✅ Produto salvo com sucesso!');
  fecharModal('modal-produto');
  carregarProdutosAdmin();
}

// ── Toggle ativo/inativo ──────────────────────
async function toggleProduto(id, ativo) {
  await db.ref('produtos/' + id).update({ ativo: !ativo });
  toast(ativo ? '⚫ Produto desativado do cardápio.' : '✅ Produto ativado no cardápio!', ativo ? 'warn' : 'ok');
  carregarProdutosAdmin();
}

// ── Deletar produto ───────────────────────────
async function deletarProduto(id, nome, imagemUrl) {
  if (!confirm(`Deletar permanentemente "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
  mostrarLoading(true);

  // Remove imagem do Storage se existir
  if (imagemUrl) {
    try {
      await storage.refFromURL(imagemUrl).delete();
    } catch(e) { /* silencioso — arquivo pode já não existir */ }
  }

  await db.ref('produtos/' + id).remove();
  mostrarLoading(false);
  toast('🗑️ Produto removido.');
  carregarProdutosAdmin();
}

// ── Filtro por categoria ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prod-cat-filter')?.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn-admin');
    if (!btn) return;
    prodCatAtiva = btn.dataset.pcat;
    document.querySelectorAll('.cat-btn-admin').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    carregarProdutosAdmin();
  });

  // Enter no campo sabor
  document.getElementById('sabor-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarSabor(); }
  });
});
