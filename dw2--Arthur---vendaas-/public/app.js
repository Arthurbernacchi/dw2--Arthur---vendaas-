const apiBase = '';

function $id(id){return document.getElementById(id)}
const produtosEl = $id('produtos');
const cartBtn = $id('cart-btn');
const cartCount = $id('cart-count');
const cartDrawer = $id('cart-drawer');
const cartItemsEl = $id('cart-items');
const closeCart = $id('close-cart');
const subtotalEl = $id('subtotal');
const cupomInput = $id('cupom');
const applyCupomBtn = $id('apply-cupom');
const confirmOrderBtn = $id('confirm-order');
const searchInput = $id('search');
const sortSelect = $id('sort');

let produtos = [];
let cart = JSON.parse(localStorage.getItem('cart:vendaas')||'[]');
let activeCupom = localStorage.getItem('cupom:vendaas') || '';

function toast(msg){const t=$id('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}

function saveCart(){localStorage.setItem('cart:vendaas', JSON.stringify(cart));renderCartCount();}
function renderCartCount(){const total = cart.reduce((s,i)=>s + Number(i.quantidade),0);cartCount.textContent = total}

function fetchProdutos(){
  const q = encodeURIComponent(searchInput.value||'');
  const sort = sortSelect.value ? `&sort=${encodeURIComponent(sortSelect.value)}` : '';
  const url = `/produtos?search=${q}${sort}`;
  fetch(url).then(r=>r.json()).then(data=>{produtos = data; renderProdutos();}).catch(e=>toast('Erro ao buscar produtos'));
}

function renderProdutos(){
  produtosEl.innerHTML='';
  const tpl = document.getElementById('produto-card');
  produtos.forEach(p=>{
    const clone = tpl.content.cloneNode(true);
    clone.querySelector('.thumb').src = `/img/placeholder.png`;
    clone.querySelector('.thumb').alt = p.nome;
    clone.querySelector('.nome').textContent = p.nome;
    clone.querySelector('.descricao').textContent = p.descricao || '';
    clone.querySelector('.preco').textContent = p.preco.toFixed(2);
    clone.querySelector('.estoque').textContent = p.estoque;
    const qtd = clone.querySelector('.qtd');
    const add = clone.querySelector('.add');
    add.addEventListener('click', ()=>{
      const q = Number(qtd.value) || 1;
      if (p.estoque <= 0) { toast('Produto sem estoque'); return; }
      if (q > p.estoque) { toast('Quantidade maior que estoque'); return; }
      addToCart(p.id, q);
    });
    produtosEl.appendChild(clone);
  });
}

function addToCart(produtoId, quantidade){
  const existing = cart.find(i=>i.produtoId===produtoId);
  if (existing){ existing.quantidade = Number(existing.quantidade) + Number(quantidade); }
  else cart.push({ produtoId, quantidade: Number(quantidade) });
  saveCart(); toast('Adicionado ao carrinho'); renderCartItems();
}

function renderCartItems(){
  cartItemsEl.innerHTML='';
  if (!cart.length) cartItemsEl.textContent = 'Carrinho vazio';
  else{
    cart.forEach(async (it)=>{
      const p = produtos.find(x=>x.id===it.produtoId) || (await fetch(`/produtos?search=${encodeURIComponent('')}`).then(r=>r.json()).then(list=>list.find(x=>x.id===it.produtoId)));
      const div = document.createElement('div');
      div.className='cart-line';
      div.innerHTML = `<div><strong>${p.nome}</strong><div>R$${p.preco.toFixed(2)} x <input type="number" min="1" value="${it.quantidade}" class="cart-qtd"/></div></div><div><button class="remove">Remover</button></div>`;
      const inputQtd = div.querySelector('.cart-qtd');
      inputQtd.addEventListener('change', (e)=>{
        const v = Number(e.target.value)||1; if (v > p.estoque) { toast('Quantidade maior que estoque'); e.target.value = it.quantidade; return; }
        it.quantidade = v; saveCart(); renderCartItems();
      });
      div.querySelector('.remove').addEventListener('click', ()=>{ cart = cart.filter(x=>x.produtoId!==it.produtoId); saveCart(); renderCartItems(); });
      cartItemsEl.appendChild(div);
    });
  }
  // subtotal
  const subs = cart.reduce((s,i)=>{
    const p = produtos.find(x=>x.id===i.produtoId); return s + (p ? p.preco * i.quantidade : 0);
  },0);
  subtotalEl.textContent = `Subtotal: R$${subs.toFixed(2)}`;
}

applyCupomBtn.addEventListener('click', ()=>{
  const code = cupomInput.value.trim(); if (!code) return toast('Informe cupom');
  if (code.toUpperCase() === 'ALUNO10'){ activeCupom = code; localStorage.setItem('cupom:vendaas', code); toast('Cupom aplicado'); }
  else { toast('Cupom inválido'); }
});

confirmOrderBtn.addEventListener('click', ()=>{
  if (!cart.length) return toast('Carrinho vazio');
  const body = { itens: cart.map(i=>({ produtoId: i.produtoId, quantidade: i.quantidade })), cupom: activeCupom };
  fetch('/carrinho/confirmar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(async r=>{
    if (!r.ok) { const err = await r.json().catch(()=>({error:'Erro'})); return toast(err.error || 'Erro no pedido'); }
    const data = await r.json(); toast('Pedido confirmado! Total R$' + data.pedido.total_final.toFixed(2)); cart = []; saveCart(); renderCartItems(); fetchProdutos();
  }).catch(()=>toast('Erro ao confirmar pedido'));
});

cartBtn.addEventListener('click', ()=>{ cartDrawer.classList.add('open'); cartDrawer.setAttribute('aria-hidden','false'); cartBtn.setAttribute('aria-pressed','true'); renderCartItems(); });
closeCart.addEventListener('click', ()=>{ cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden','true'); cartBtn.setAttribute('aria-pressed','false'); });

searchInput.addEventListener('input', ()=>{ fetchProdutos(); });
sortSelect.addEventListener('change', ()=>{ localStorage.setItem('sort:vendaas', sortSelect.value); fetchProdutos(); });

// Persist sort
const persistedSort = localStorage.getItem('sort:vendaas'); if (persistedSort) sortSelect.value = persistedSort;

// placeholder image
fetch('/img/placeholder.png').catch(()=>{});

fetchProdutos(); renderCartCount(); renderCartItems();
