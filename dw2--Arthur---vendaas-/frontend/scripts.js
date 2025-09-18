const API = 'http://localhost:8000';
let produtos = [];
let cart = JSON.parse(localStorage.getItem('cart')||'[]');
let appliedCoupon = localStorage.getItem('coupon')||'';
let sortKey = localStorage.getItem('sort')||'';
let page = 1;
const PAGE_SIZE = 10;

async function load(){
  const res = await fetch(API + '/produtos');
  produtos = await res.json();
  applySort();
  render();
}

function render(){
  const grid = document.getElementById('catalog');
  grid.innerHTML = '';
  // pagination
  const start = (page-1)*PAGE_SIZE;
  const pageItems = produtos.slice(start, start+PAGE_SIZE);
  pageItems.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<div class="name">${p.nome}</div><div>${p.categoria}</div><div>Estoque: ${p.estoque}</div><div class="price">R$ ${p.preco.toFixed(2)}</div><button data-id="${p.id}">Adicionar</button>`;
    grid.appendChild(card);
  });
  document.querySelectorAll('.card button').forEach(b=>b.addEventListener('click', addToCart));
  updateCartCount();
  renderPagination();
}

function addToCart(e){
  const id = e.target.dataset.id;
  const p = produtos.find(x=>x.id===id);
  if (p.estoque === 0){ alert('Produto sem estoque'); return }
  const item = cart.find(i=>i.produtoId===id);
  if (item) item.quantidade += 1; else cart.push({ produtoId: id, quantidade: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){ document.getElementById('cart-count').textContent = cart.reduce((s,i)=>s+i.quantidade,0) }

// Cart drawer
const drawer = document.getElementById('cart-drawer');
document.getElementById('open-cart').addEventListener('click', ()=>{ drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); renderCart();});
document.getElementById('close-cart').addEventListener('click', ()=>{ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });

function renderCart(){
  const el = document.getElementById('cart-items'); el.innerHTML='';
  cart.forEach(it=>{
    const p = produtos.find(x=>x.id===it.produtoId);
    const row = document.createElement('div'); row.innerHTML = `${p.nome} x ${it.quantidade} - R$ ${(p.preco*it.quantidade).toFixed(2)} <button data-id="${it.produtoId}" class="remove">Remover</button>`;
    el.appendChild(row);
  });
  document.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', (ev)=>{ const id=ev.target.dataset.id; cart=cart.filter(i=>i.produtoId!==id); localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); updateCartCount(); }));
  const subtotal = cart.reduce((s,i)=>{ const p=produtos.find(x=>x.id===i.produtoId); return s + (p.preco*i.quantidade) },0);
  document.getElementById('cart-summary').textContent = `Subtotal: R$ ${subtotal.toFixed(2)}`;
}

// apply coupon
document.getElementById('apply-coupon').addEventListener('click', ()=>{ appliedCoupon = document.getElementById('coupon').value; localStorage.setItem('coupon', appliedCoupon); alert('Cupom aplicado'); renderCart(); });

// confirm order -> call backend
document.getElementById('confirm-order').addEventListener('click', async ()=>{
  const body = { itens: cart.map(i=>({ produtoId: i.produtoId, quantidade: i.quantidade })), cupom: appliedCoupon };
  const res = await fetch(API + '/carrinho/confirmar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!res.ok){ const err = await res.json(); alert('Erro: '+(err.detail||err.error||JSON.stringify(err))); return }
  const data = await res.json(); alert('Pedido criado: '+data.id + ' total: R$ '+data.total_final);
  cart = [];
  localStorage.removeItem('cart');
  renderCart();
  updateCartCount();
  load();
});

// search
document.getElementById('search').addEventListener('input', async (e)=>{
  const q = e.target.value;
  const res = await fetch(API + '/produtos?search=' + encodeURIComponent(q));
  produtos = await res.json();
  applySort();
  render();
});

// Sort
document.getElementById('sort').value = sortKey;
document.getElementById('sort').addEventListener('change', (e)=>{ sortKey = e.target.value; localStorage.setItem('sort', sortKey); applySort(); render(); });
function applySort(){
  if (!sortKey) return;
  switch(sortKey){
    case 'preco_asc': produtos.sort((a,b)=>a.preco-b.preco); break;
    case 'preco_desc': produtos.sort((a,b)=>b.preco-a.preco); break;
    case 'nome_asc': produtos.sort((a,b)=>a.nome.localeCompare(b.nome)); break;
    case 'nome_desc': produtos.sort((a,b)=>b.nome.localeCompare(a.nome)); break;
  }
}

// Pagination controls
function renderPagination(){
  const totalPages = Math.max(1, Math.ceil(produtos.length / PAGE_SIZE));
  const containerId = 'pagination-container';
  let container = document.getElementById(containerId);
  if (!container){ container = document.createElement('div'); container.id = containerId; container.className='pagination'; document.querySelector('main').appendChild(container); }
  container.innerHTML = '';
  for (let i=1;i<=totalPages;i++){
    const btn = document.createElement('button'); btn.textContent = i; if (i===page) btn.disabled=true; btn.addEventListener('click', ()=>{ page = i; render(); }); container.appendChild(btn);
  }
}

// Admin modal
document.getElementById('open-admin').addEventListener('click', ()=>{ document.getElementById('admin-modal').setAttribute('aria-hidden','false'); document.getElementById('p-nome').focus(); });
document.getElementById('close-admin').addEventListener('click', ()=>{ document.getElementById('admin-modal').setAttribute('aria-hidden','true'); });
document.getElementById('product-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const nome = document.getElementById('p-nome').value.trim();
  const descricao = document.getElementById('p-desc').value.trim();
  const preco = parseFloat(document.getElementById('p-preco').value);
  const estoque = parseInt(document.getElementById('p-estoque').value,10);
  const categoria = document.getElementById('p-categoria').value.trim();
  const sku = document.getElementById('p-sku').value.trim();
  // simple front validation
  if (nome.length < 3 || nome.length > 60){ alert('Nome deve ter entre 3 e 60 caracteres'); return }
  if (isNaN(preco) || preco < 0.01){ alert('Preço inválido'); return }
  if (isNaN(estoque) || estoque < 0){ alert('Estoque inválido'); return }
  if (!categoria){ alert('Categoria é obrigatória'); return }
  // prevent duplicate name locally
  if (produtos.some(p=>p.nome.toLowerCase() === nome.toLowerCase())){ alert('Já existe um produto com esse nome'); return }
  const body = { nome, descricao, preco, estoque, categoria, sku };
  const res = await fetch(API + '/produtos', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!res.ok){ alert('Erro ao criar produto'); return }
  const novo = await res.json(); produtos.unshift(novo); applySort(); render(); document.getElementById('admin-modal').setAttribute('aria-hidden','true');
});

// keyboard shortcut Alt+N to open admin
window.addEventListener('keydown', (e)=>{ if (e.altKey && e.key.toLowerCase()==='n'){ e.preventDefault(); document.getElementById('open-admin').click(); } });

window.addEventListener('load', ()=> load());
