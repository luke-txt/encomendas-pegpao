// ══════════════════════════════════════════════
// auth.js — Autenticação do cliente
// Email/Senha + Login com Google
// ══════════════════════════════════════════════

let currentUser = null;

// Provider Google
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Auth state ────────────────────────────────
auth.onAuthStateChanged(user => {
  currentUser = user;
  atualizarHeaderAuth();
});

// ── Header: logado ou não ─────────────────────
function atualizarHeaderAuth() {
  const area = document.getElementById('header-auth-area');
  if (!area) return;

  if (currentUser) {
    const nome = currentUser.displayName || currentUser.email.split('@')[0];
    const ini  = nome[0].toUpperCase();
    const foto = currentUser.photoURL;
    area.innerHTML = `
      <div class="user-menu">
        <div class="user-avatar" onclick="toggleUserMenu()">
          ${foto ? `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ini}
        </div>
        <div class="user-dropdown" id="user-dropdown">
          <div class="ud-nome">${nome}</div>
          <div class="ud-email">${currentUser.email}</div>
          <div class="ud-divider"></div>
          <div class="ud-item" onclick="abrirMeusPedidos()">📦 Meus pedidos</div>
          <div class="ud-divider"></div>
          <div class="ud-item danger" onclick="auth.signOut().then(()=>toast('Até logo! 👋'))">⎋ Sair</div>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <button class="btn-header-login" onclick="abrirModal('modal-auth')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Entrar
      </button>`;
  }
}

function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('user-dropdown')?.classList.remove('open');
  }
});

// ── Login com Google ──────────────────────────
async function loginGoogle() {
  try {
    mostrarLoading(true);
    const result = await auth.signInWithPopup(googleProvider);
    const user   = result.user;
    // Salva/atualiza perfil do cliente
    await db.ref('clientes/' + user.uid).update({
      nome:      user.displayName || '',
      email:     user.email || '',
      foto:      user.photoURL || '',
      ultimoLogin: Date.now()
    });
    mostrarLoading(false);
    fecharModal('modal-auth');
    toast('Bem-vindo(a), ' + (user.displayName || '') + '! 👋');
  } catch (err) {
    mostrarLoading(false);
    if (err.code !== 'auth/popup-closed-by-user') {
      toast('Erro ao entrar com Google: ' + err.message, 'err');
    }
  }
}

// ── Login com e-mail ──────────────────────────
async function loginEmail(email, pass, erroId) {
  try {
    mostrarLoading(true);
    await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), pass);
    mostrarLoading(false);
    return true;
  } catch (err) {
    mostrarLoading(false);
    const el = document.getElementById(erroId);
    if (el) {
      el.textContent = (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
        ? 'Email ou senha incorretos.' : 'Erro: ' + err.message;
      el.style.display = 'block';
    }
    return false;
  }
}

// ── Cadastro com e-mail ───────────────────────
async function cadastrarEmail(nome, nasc, email, pass, pass2, erroId) {
  const el = document.getElementById(erroId);
  if (el) el.style.display = 'none';

  if (!nome.trim())  { if(el){el.textContent='Informe seu nome completo.';el.style.display='block';} return false; }
  if (!nasc)         { if(el){el.textContent='Informe sua data de nascimento.';el.style.display='block';} return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if(el){el.textContent='Email inválido.';el.style.display='block';} return false; }
  if (pass.length < 6) { if(el){el.textContent='Senha mínimo 6 caracteres.';el.style.display='block';} return false; }
  if (pass !== pass2)  { if(el){el.textContent='As senhas não conferem.';el.style.display='block';} return false; }

  try {
    mostrarLoading(true);
    const cred = await auth.createUserWithEmailAndPassword(email.trim().toLowerCase(), pass);
    await cred.user.updateProfile({ displayName: nome.trim() });
    await db.ref('clientes/' + cred.user.uid).set({
      nome: nome.trim(), nasc, email: email.trim().toLowerCase(), criadoEm: Date.now()
    });
    mostrarLoading(false);
    return true;
  } catch (err) {
    mostrarLoading(false);
    if (el) {
      el.textContent = err.code === 'auth/email-already-in-use'
        ? 'Este e-mail já está cadastrado. Faça login!' : 'Erro: ' + err.message;
      el.style.display = 'block';
    }
    return false;
  }
}

// ── Troca de abas auth ────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('#modal-auth .auth-tab').forEach((t, i) =>
    t.classList.toggle('active', i === (tab === 'login' ? 0 : 1)));
  document.getElementById('auth-form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('auth-form-cadastro').classList.toggle('active', tab === 'cadastro');
}

function switchCoTab(tab) {
  document.querySelectorAll('#step-auth .auth-tab').forEach((t, i) =>
    t.classList.toggle('active', i === (tab === 'login' ? 0 : 1)));
  document.getElementById('co-form-login').classList.toggle('active',    tab === 'login');
  document.getElementById('co-form-cadastro').classList.toggle('active', tab === 'cadastro');
}
