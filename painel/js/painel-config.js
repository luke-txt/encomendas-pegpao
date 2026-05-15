// ══════════════════════════════════════════════
// painel-config.js — Firebase + Constantes
// ⚠️ Substitua COLE_AQUI pelas credenciais do
//    Firebase do projeto de ENCOMENDAS
// ══════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyAe7UdbQ983NJ7bIz2RV2QZl6QKsTLTSyI",
  authDomain: "encomendas-pegpao.firebaseapp.com",
  databaseURL: "https://encomendas-pegpao-default-rtdb.firebaseio.com",
  projectId: "encomendas-pegpao",
  storageBucket: "encomendas-pegpao.firebasestorage.app",
  messagingSenderId: "691406886346",
  appId: "1:691406886346:web:c5501f45cfb62ed75dab33",
  measurementId: "G-MQB8KT9DT0"
};

firebase.initializeApp(firebaseConfig);
const db      = firebase.database();
const auth    = firebase.auth();
const storage = firebase.storage();

// ── Padarias ──────────────────────────────────
const PADARIAS = [
  { id:'mongagua_1',   nome:'Mongaguá 1',   cidade:'Mongaguá',    ico:'🌊' },
  { id:'mongagua_2',   nome:'Mongaguá 2',   cidade:'Mongaguá',    ico:'🌊' },
  { id:'itanhaem_1',   nome:'Itanhaém 1',   cidade:'Itanhaém',    ico:'🏝️' },
  { id:'itanhaem_2',   nome:'Itanhaém 2',   cidade:'Itanhaém',    ico:'🏝️' },
  { id:'itanhaem_3',   nome:'Itanhaém 3',   cidade:'Itanhaém',    ico:'🏝️' },
  { id:'peruibe_1',    nome:'Peruíbe 1',    cidade:'Peruíbe',     ico:'🐟' },
  { id:'saovicente_1', nome:'São Vicente',  cidade:'São Vicente',  ico:'⚓' }
];

const NIVEL = { OPERADOR:1, GERENTE:2, ADMIN:3, DONO:4 };

// ── Helpers ───────────────────────────────────
function fmtPreco(v) { return 'R$ ' + Number(v||0).toFixed(2).replace('.',','); }
function fmtData(d)  { if(!d)return'—'; const[y,m,dd]=d.split('-'); return`${dd}/${m}/${y}`; }
function dataHoje()  { const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); }
function saudacao()  { const h=new Date().getHours(); return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; }

function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'show '+(type||'ok');
  clearTimeout(el._t); el._t = setTimeout(()=>el.className='', 3400);
}
function mostrarLoading(s) { document.getElementById('loading')?.classList.toggle('show', s); }
function abrirModal(id)    { document.getElementById(id)?.classList.add('open'); }
function fecharModal(id)   { document.getElementById(id)?.classList.remove('open'); }

// E-mail de notificação ao cliente (via EmailJS)
function enviarEmailStatus(pedido, status) {
  const msgs = {
    CONFIRMADO: 'Seu pedido foi confirmado! Começaremos a preparar em breve. 🎉',
    PREPARO:    'Seu pedido está sendo preparado com carinho! 👨‍🍳',
    PRONTO:     'Seu pedido está PRONTO para retirada! Pode vir buscar na padaria. 🎊'
  };
  if (!msgs[status]) return;
  // Configure no emailjs.com e descomente:
  // emailjs.send('SERVICE_ID','TEMPLATE_STATUS',{
  //   to_email: pedido.clienteEmail,
  //   to_name:  pedido.clienteNome,
  //   pedido_num: pedido.num,
  //   status_msg: msgs[status],
  //   padaria:    pedido.padariaNome,
  //   data_retirada: fmtData(pedido.dataRetirada)
  // },'PUBLIC_KEY');
  console.log('[Email]', pedido.clienteEmail, '→', status, msgs[status]);
}
