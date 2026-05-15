// ══════════════════════════════════════════════
// painel-auth.js — Auth do painel interno
// ══════════════════════════════════════════════

let userLevel = null, currentUser = null, currentPadariaId = null;

const authTimeout = setTimeout(() => mostrarLogin(), 10000);

auth.onAuthStateChanged(async user => {
  clearTimeout(authTimeout);
  if (!user) { mostrarLogin(); return; }
  try {
    const snap   = await db.ref('painel_usuarios/' + user.uid).once('value');
    const perfil = snap.val();
    if (!perfil || perfil.ativo === false) { await auth.signOut(); mostrarLogin('Acesso negado.'); return; }

    userLevel   = perfil.nivel || 'GERENTE';
    currentUser = { uid:user.uid, email:user.email, nome:perfil.nome||user.email.split('@')[0], padaria_id:perfil.padaria_id||null };

    esconderTudo();
    if (isPode('DONO')) mostrarDono();
    else {
      currentPadariaId = currentUser.padaria_id;
      if (!currentPadariaId) { await auth.signOut(); mostrarLogin('Sem padaria atribuída.'); return; }
      mostrarApp(currentPadariaId);
    }
  } catch(e) { await auth.signOut(); mostrarLogin('Erro: ' + e.message); }
});

function isPode(n) { return (NIVEL[userLevel]||0) >= (NIVEL[n]||99); }

function esconderTudo() {
  ['login-screen','dono-screen','app-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function mostrarLogin(erro) {
  esconderTudo();
  document.getElementById('login-screen').style.display = 'flex';
  if (erro) {
    const el = document.getElementById('login-error');
    el.textContent = erro; el.style.display = 'block';
  }
}

let loginAttempts = 0, loginBloqueado = false;

function iniciarLogin() {
  if (loginBloqueado) { toast('Aguarde 30 segundos.','err'); return; }
  const email = document.getElementById('inp-email').value.trim().toLowerCase();
  const pass  = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!email || !pass) return;
  mostrarLoading(true);
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => { loginAttempts = 0; mostrarLoading(false); })
    .catch(err => {
      mostrarLoading(false); loginAttempts++;
      if (loginAttempts >= 5) {
        loginBloqueado = true;
        setTimeout(() => { loginBloqueado=false; loginAttempts=0; }, 30000);
        errEl.textContent = 'Bloqueado por 30s após 5 tentativas.';
      } else {
        errEl.textContent = (err.code==='auth/wrong-password'||err.code==='auth/user-not-found')
          ? `Email ou senha incorretos. (${loginAttempts}/5)` : 'Erro: '+err.message;
      }
      errEl.style.display = 'block';
    });
}
