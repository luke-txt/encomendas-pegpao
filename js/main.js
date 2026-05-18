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

// ── Retorno do Asaas após pagamento ───────────
(function verificarRetornoAsaas() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('pagamento');
  const num    = params.get('pedido');
  if (!status) return;

  // Limpa a URL
  window.history.replaceState({}, '', '/');

  if (status === 'sucesso') {
    // Aguarda o Firebase Auth carregar e atualiza o status
    const tentarAtualizar = (tentativas = 0) => {
      const user = auth.currentUser;
      if (user) {
        db.ref('pedidos_cliente/' + user.uid + '/' + num).update({ status: 'CONFIRMADO' });
        setTimeout(() => {
          toast('✅ Pagamento confirmado! Pedido #' + num + ' aprovado.', 'ok');
          // Abre meus pedidos automaticamente
          if (typeof abrirMeusPedidos === 'function') abrirMeusPedidos();
        }, 500);
      } else if (tentativas < 10) {
        setTimeout(() => tentarAtualizar(tentativas + 1), 500);
      } else {
        toast('✅ Pagamento confirmado! Verifique seus pedidos.', 'ok');
      }
    };
    tentarAtualizar();

  } else if (status === 'pendente') {
    toast('⏳ Pagamento em análise. Você receberá uma confirmação.', 'warn');
  } else if (status === 'erro') {
    toast('❌ Pagamento não concluído. Tente novamente.', 'err');
  }
})();

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
