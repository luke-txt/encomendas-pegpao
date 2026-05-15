// ══════════════════════════════════════════════
// painel-main.js — Inicialização e eventos
// ══════════════════════════════════════════════

// ── Splash ────────────────────────────────────
setTimeout(() => {
  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => {
    const s = document.getElementById('splash');
    if (s) s.style.display = 'none';
  }, 600);
}, 3000);

// ── App padaria ───────────────────────────────
function mostrarApp(pid) {
  currentPadariaId = pid;
  const padaria = PADARIAS.find(p => p.id === pid);
  esconderTudo();
  document.getElementById('app-screen').style.display = 'flex';
  document.getElementById('app-padaria-name').textContent = padaria?.nome || pid;
  document.getElementById('app-user-name').textContent    = currentUser.nome;
  document.getElementById('app-nivel-pill').textContent   =
    userLevel === 'DONO' ? '👑 Dono' :
    userLevel === 'ADMIN' ? '🔴 Admin' :
    userLevel === 'GERENTE' ? '🟡 Gerente' : '🟢 Operador';

  document.getElementById('btn-app-voltar').onclick = () => {
    if (isPode('DONO')) {
      esconderTudo();
      mostrarDono();
    } else {
      auth.signOut();
    }
  };
  // Atualiza label do botão voltar
  const voltarBtn = document.getElementById('btn-app-voltar');
  if (isPode('DONO')) {
    voltarBtn.title = 'Voltar ao Painel Geral';
    voltarBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>';
  }

  carregarPedidos(pid);
  switchTab('dashboard');
}

// ── Navegação de tabs ─────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-tab]').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + tab)?.classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tab}"]`)?.classList.add('active');
  if (tab === 'pedidos')   renderPedidos();
  if (tab === 'dashboard') renderDashboardApp();
  fecharDrawer();
}

// ── Drawer ────────────────────────────────────
function fecharDrawer() {
  document.getElementById('drawer-mais')?.classList.remove('open');
  document.getElementById('drawer-bg')?.classList.remove('open');
}

// ── DOM Ready ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Login
  document.getElementById('btn-login')?.addEventListener('click', iniciarLogin);
  document.getElementById('inp-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') iniciarLogin();
  });

  // Dono logout
  document.getElementById('dono-logout-btn')?.addEventListener('click', () => auth.signOut());

  // Dono tabs
  document.querySelectorAll('.dono-tab[data-tab]').forEach(t => {
    t.addEventListener('click', () => switchDonoTab(t.dataset.tab));
  });

  // Nav bottom
  document.querySelectorAll('.nav-btn[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });

  // Drawer mais
  document.getElementById('nav-mais-btn')?.addEventListener('click', () => {
    document.getElementById('drawer-mais')?.classList.add('open');
    document.getElementById('drawer-bg')?.classList.add('open');
  });
  document.getElementById('drawer-bg')?.addEventListener('click', fecharDrawer);
  document.getElementById('drawer-logout')?.addEventListener('click', () => {
    if (isPode('DONO')) { esconderTudo(); mostrarDono(); }
    else auth.signOut();
  });

  // Filtro pedidos
  document.getElementById('filter-pedidos')?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filtroAtual = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPedidos();
  });

  // Busca pedidos
  document.getElementById('busca-pedido')?.addEventListener('input', function() {
    buscaAtual = this.value.trim().toLowerCase();
    renderPedidos();
  });

  // Salvar produto
  document.getElementById('btn-salvar-produto')?.addEventListener('click', salvarProduto);

  // Modal produto: click na área de imagem
  document.getElementById('img-upload-area')?.addEventListener('click', () => {
    document.getElementById('prod-img-input')?.click();
  });

  // Enter no campo sabor
  document.getElementById('sabor-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarSabor(); }
  });

  // Fechar modais clicando no fundo
  document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.classList.remove('open');
    });
  });

  // Inatividade (8h)
  let inTimer;
  const resetTimer = () => {
    clearTimeout(inTimer);
    inTimer = setTimeout(() => {
      if (currentUser) {
        toast('Sessão encerrada por inatividade.', 'warn');
        setTimeout(() => auth.signOut(), 2000);
      }
    }, 8 * 60 * 60 * 1000);
  };
  ['click', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, resetTimer, { passive: true }));
  resetTimer();
});
