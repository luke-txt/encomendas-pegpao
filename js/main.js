// ══════════════════════════════════════════════
// main.js — Inicialização e eventos globais
// ══════════════════════════════════════════════

// ── Splash ────────────────────────────────────
setTimeout(() => {
  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => {
    const s = document.getElementById('splash');
    if (s) s.style.display = 'none';
  }, 600);
}, 3000);

document.addEventListener('DOMContentLoaded', () => {

  // ── Carrinho ────────────────────────────────
  document.getElementById('cart-btn')?.addEventListener('click', abrirCarrinho);
  document.getElementById('drawer-bg')?.addEventListener('click', fecharCarrinho);

  // ── Fechar modais clicando no fundo ─────────
  document.querySelectorAll('.modal-bg').forEach(bg => {
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.classList.remove('open');
    });
  });

  // ── Auth tabs ────────────────────────────────
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.authTab));
  });

  // ── Google login buttons ─────────────────────
  // (os listeners ficam no checkout.js)

  // ── Footer links ─────────────────────────────
  document.querySelectorAll('.footer-link[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.action === 'pedidos') abrirMeusPedidos();
    });
  });

  // ── Inatividade (8h) ─────────────────────────
  let inTimer;
  const resetInTimer = () => {
    clearTimeout(inTimer);
    inTimer = setTimeout(() => {
      if (currentUser) {
        toast('Sessão encerrada por inatividade.', 'warn');
        setTimeout(() => auth.signOut(), 2000);
      }
    }, 8 * 60 * 60 * 1000);
  };
  ['click','keydown','touchstart'].forEach(ev =>
    document.addEventListener(ev, resetInTimer, { passive: true }));
  resetInTimer();
});
