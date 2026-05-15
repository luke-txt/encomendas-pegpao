// ══════════════════════════════════════════════
// config.js — Firebase + Constantes compartilhadas
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
const storage = firebase.storage ? firebase.storage() : null;

// ── Mercado Pago ──────────────────────────────
// ⚠️ Substitua pela sua Public Key do Mercado Pago
// Obtenha em: https://www.mercadopago.com.br/developers
const MP_PUBLIC_KEY = "COLE_AQUI_SUA_PUBLIC_KEY_MP";

// Chave Pix (fallback manual)
const PIX_CHAVE = "pegpao@pagamento.com.br";

// ── Padarias ──────────────────────────────────
const PADARIAS = [
  { id:'mongagua_1',   nome:'PegPão Mongaguá 1',  cidade:'Mongaguá',    ico:'🌊', lat:-24.0920, lng:-46.6219, endereco:'Rua das Flores, 100 — Mongaguá/SP'    },
  { id:'mongagua_2',   nome:'PegPão Mongaguá 2',  cidade:'Mongaguá',    ico:'🌊', lat:-24.1000, lng:-46.6300, endereco:'Av. Principal, 200 — Mongaguá/SP'     },
  { id:'itanhaem_1',   nome:'PegPão Itanhaém 1',  cidade:'Itanhaém',    ico:'🏝️', lat:-24.1825, lng:-46.7895, endereco:'Rua das Palmeiras, 300 — Itanhaém/SP' },
  { id:'itanhaem_2',   nome:'PegPão Itanhaém 2',  cidade:'Itanhaém',    ico:'🏝️', lat:-24.1900, lng:-46.7950, endereco:'Av. Central, 400 — Itanhaém/SP'       },
  { id:'itanhaem_3',   nome:'PegPão Itanhaém 3',  cidade:'Itanhaém',    ico:'🏝️', lat:-24.1750, lng:-46.7800, endereco:'Rua do Comércio, 500 — Itanhaém/SP'   },
  { id:'peruibe_1',    nome:'PegPão Peruíbe 1',   cidade:'Peruíbe',     ico:'🐟', lat:-24.3178, lng:-47.0050, endereco:'Av. Beira Rio, 600 — Peruíbe/SP'       },
  { id:'saovicente_1', nome:'PegPão São Vicente',  cidade:'São Vicente', ico:'⚓', lat:-23.9632, lng:-46.3890, endereco:'Rua Getúlio Vargas, 700 — São Vicente/SP'}
];

// ── Categorias ────────────────────────────────
const CATEGORIAS = {
  bolos:             { label:'Bolos',             ico:'🎂' },
  'bolos-confeitados':{ label:'Bolos Confeitados', ico:'✨' },
  baguetes:          { label:'Baguetes',           ico:'🥖' },
  docinhos:          { label:'Docinhos de Festa',  ico:'🍬' },
  salgados:          { label:'Salgados de Festa',  ico:'🥟' },
  assados:           { label:'Assados de Festa',   ico:'🥘' }
};

// ── Produtos padrão (usado se Firebase estiver vazio) ──
const PRODUTOS_DEFAULT = [
  // BOLOS
  { id:'bolo-p', nome:'Bolo Simples P', cat:'bolos', ico:'🎂', preco:35, desc:'Tamanho P (15cm). Perfeito para pequenas comemorações. Sabor a combinar.', qtdMin:1, sabores:['Chocolate','Baunilha','Cenoura','Limão','Morango'] },
  { id:'bolo-m', nome:'Bolo Simples M', cat:'bolos', ico:'🎂', preco:55, desc:'Tamanho M (20cm). Rende ~15 fatias. Sabor a combinar.', qtdMin:1, sabores:['Chocolate','Baunilha','Cenoura','Limão','Morango'] },
  { id:'bolo-g', nome:'Bolo Simples G', cat:'bolos', ico:'🎂', preco:80, desc:'Tamanho G (25cm). Rende ~25 fatias. Sabor a combinar.', qtdMin:1, sabores:['Chocolate','Baunilha','Cenoura','Limão','Morango'] },
  // CONFEITADOS
  { id:'bolo-cf-p', nome:'Bolo Confeitado P', cat:'bolos-confeitados', ico:'✨', preco:65,  desc:'Bolo confeitado artesanal tamanho P. Decoração personalizada.', qtdMin:1, sabores:['Chocolate','Morango','Red Velvet','Nozes'] },
  { id:'bolo-cf-m', nome:'Bolo Confeitado M', cat:'bolos-confeitados', ico:'✨', preco:95,  desc:'Bolo confeitado artesanal tamanho M. Rende ~15 fatias.', qtdMin:1, sabores:['Chocolate','Morango','Red Velvet','Nozes'] },
  { id:'bolo-cf-g', nome:'Bolo Confeitado G', cat:'bolos-confeitados', ico:'✨', preco:140, desc:'Bolo confeitado artesanal tamanho G. Rende ~25 fatias.', qtdMin:1, sabores:['Chocolate','Morango','Red Velvet','Nozes'] },
  // BAGUETES
  { id:'baguete-un',  nome:'Baguete Tradicional',  cat:'baguetes', ico:'🥖', preco:8,   desc:'Baguete francesa crocante e macia. Por unidade.', qtdMin:1 },
  { id:'baguete-int', nome:'Baguete Integral',      cat:'baguetes', ico:'🥖', preco:9.5, desc:'Baguete integral com grãos. Mais nutritiva. Por unidade.', qtdMin:1 },
  { id:'baguete-12',  nome:'Pacote 12 Baguetes',    cat:'baguetes', ico:'🥖', preco:85,  desc:'12 baguetes tradicionais. Ideal para festas.', qtdMin:1 },
  // DOCINHOS
  { id:'doc-50',  nome:'Docinhos — 50 unidades',  cat:'docinhos', ico:'🍬', preco:75,  desc:'50 docinhos variados para festa. Brigadeiro, beijinho, casadinho e mais.', qtdMin:50,  sabores:['Brigadeiro','Beijinho','Casadinho','Bicho-de-pé'] },
  { id:'doc-100', nome:'Docinhos — 100 unidades', cat:'docinhos', ico:'🍬', preco:140, desc:'100 docinhos variados. Ideal para festas maiores.', qtdMin:100, sabores:['Brigadeiro','Beijinho','Casadinho','Bicho-de-pé'] },
  { id:'doc-200', nome:'Docinhos — 200 unidades', cat:'docinhos', ico:'🍬', preco:260, desc:'200 docinhos variados. Para grandes eventos.', qtdMin:200, sabores:['Brigadeiro','Beijinho','Casadinho','Bicho-de-pé'] },
  // SALGADOS
  { id:'sal-fr-50',  nome:'Salgados Fritos 50un',  cat:'salgados', ico:'🥟', preco:65,  desc:'50 salgadinhos fritos variados. Coxinha, quibe, risole e mais.', qtdMin:50,  sabores:['Coxinha','Quibe','Risole de Queijo','Enroladinho'] },
  { id:'sal-fr-100', nome:'Salgados Fritos 100un', cat:'salgados', ico:'🥟', preco:120, desc:'100 salgadinhos fritos. Perfeito para festas.', qtdMin:100, sabores:['Coxinha','Quibe','Risole de Queijo','Enroladinho'] },
  { id:'sal-as-50',  nome:'Salgados Assados 50un', cat:'salgados', ico:'🥟', preco:60,  desc:'50 salgadinhos assados variados. Opção mais leve.', qtdMin:50,  sabores:['Enroladinho de Queijo','Esfiha Frango','Esfiha Carne'] },
  // ASSADOS DE FESTA
  { id:'enrol-salsicha', nome:'Enroladinho de Salsicha',     cat:'assados', ico:'🌭', preco:60,  desc:'50 enroladinhos de salsicha assados. Crocantes e irresistíveis. Perfeito para festas.', qtdMin:50 },
  { id:'esfiha-frango',  nome:'Mini Esfiha de Frango — 50un',cat:'assados', ico:'🥙', preco:65,  desc:'50 mini esfihas fechadas de frango temperado. Assadas na hora.', qtdMin:50  },
  { id:'esfiha-carne',   nome:'Mini Esfiha de Carne — 50un', cat:'assados', ico:'🥙', preco:70,  desc:'50 mini esfihas fechadas de carne. Tempero especial da casa.', qtdMin:50  },
  { id:'bauruzinho',     nome:'Bauruzinho — 50 unidades',    cat:'assados', ico:'🥪', preco:70,  desc:'50 bauruzinhos: pão de forma, presunto, queijo e tomate. Servidos quentes.', qtdMin:50 }
];

// ── Helpers ───────────────────────────────────
function fmtPreco(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}
function fmtData(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}
function dataHoje() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}
function dataRetiranda() {
  const n = new Date(); n.setDate(n.getDate() + 3);
  return n.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
}
function dataRetiradaISO() {
  const n = new Date(); n.setDate(n.getDate() + 3);
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}
function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function distKm(la1, lo1, la2, lo2) {
  const R = 6371, dL = (la2-la1)*Math.PI/180, dO = (lo2-lo1)*Math.PI/180;
  const a = Math.sin(dL/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function padariaMaisProxima(lat, lng) {
  let min = Infinity, escolhida = PADARIAS[0];
  PADARIAS.forEach(p => { const d = distKm(lat, lng, p.lat, p.lng); if (d < min) { min = d; escolhida = p; } });
  return { ...escolhida, _dist: min };
}
function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'show ' + (type || 'ok');
  clearTimeout(el._t); el._t = setTimeout(() => el.className = '', 3400);
}
function mostrarLoading(s) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('show', s);
}
function abrirModal(id)  { document.getElementById(id)?.classList.add('open'); }
function fecharModal(id) { document.getElementById(id)?.classList.remove('open'); }
