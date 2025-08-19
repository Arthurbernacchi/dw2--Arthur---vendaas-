const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// In-memory store
let produtos = [
  {
    id: uuidv4(),
    nome: 'Camiseta Algodão',
    descricao: 'Camiseta 100% algodão tamanho M',
    preco: 49.9,
    estoque: 10,
    categoria: 'Roupas',
    sku: 'CAM-ALG-M'
  },
  {
    id: uuidv4(),
    nome: 'Caneca Cerâmica',
    descricao: 'Caneca 300ml',
    preco: 29.5,
    estoque: 25,
    categoria: 'Casa',
    sku: 'CAN-300'
  },
  {
    id: uuidv4(),
    nome: 'Livro JavaScript',
    descricao: 'Livro prático de JavaScript moderno',
    preco: 99.0,
    estoque: 5,
    categoria: 'Livros',
    sku: 'BK-JS-001'
  }
];

let pedidos = [];

// Helpers
function applySort(list, sort) {
  if (!sort) return list;
  const s = sort.toLowerCase();
  switch (s) {
    case 'preco_asc':
      return list.sort((a,b)=>a.preco-b.preco);
    case 'preco_desc':
      return list.sort((a,b)=>b.preco-a.preco);
    case 'nome_asc':
      return list.sort((a,b)=>a.nome.localeCompare(b.nome));
    case 'nome_desc':
      return list.sort((a,b)=>b.nome.localeCompare(a.nome));
    case 'estoque_asc':
      return list.sort((a,b)=>a.estoque-b.estoque);
    case 'estoque_desc':
      return list.sort((a,b)=>b.estoque-a.estoque);
    default:
      return list;
  }
}

// GET /produtos?search=&categoria=&sort=
app.get('/produtos', (req,res)=>{
  const { search, categoria, sort } = req.query;
  let result = produtos.slice();
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => (p.nome && p.nome.toLowerCase().includes(q)) || (p.descricao && p.descricao.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
  }
  if (categoria) {
    result = result.filter(p => p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase());
  }
  result = applySort(result, sort);
  res.json(result);
});

// POST /produtos
app.post('/produtos', (req,res)=>{
  const { nome, descricao, preco, estoque, categoria, sku } = req.body;
  if (!nome || preco == null || estoque == null || !categoria) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, preco, estoque, categoria' });
  }
  const novo = { id: uuidv4(), nome, descricao: descricao||null, preco: Number(preco), estoque: Number(estoque), categoria, sku: sku||null };
  produtos.push(novo);
  res.status(201).json(novo);
});

// PUT /produtos/:id
app.put('/produtos/:id', (req,res)=>{
  const { id } = req.params;
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado' });
  const { nome, descricao, preco, estoque, categoria, sku } = req.body;
  const p = produtos[idx];
  produtos[idx] = {
    ...p,
    nome: nome !== undefined ? nome : p.nome,
    descricao: descricao !== undefined ? descricao : p.descricao,
    preco: preco !== undefined ? Number(preco) : p.preco,
    estoque: estoque !== undefined ? Number(estoque) : p.estoque,
    categoria: categoria !== undefined ? categoria : p.categoria,
    sku: sku !== undefined ? sku : p.sku
  };
  res.json(produtos[idx]);
});

// DELETE /produtos/:id
app.delete('/produtos/:id', (req,res)=>{
  const { id } = req.params;
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado' });
  const removed = produtos.splice(idx,1)[0];
  res.json({ ok: true, removed });
});

// POST /carrinho/confirmar
// body: { itens: [{ produtoId, quantidade }], cupom }
app.post('/carrinho/confirmar', (req,res)=>{
  const { itens, cupom } = req.body;
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Itens do carrinho são obrigatórios' });
  }

  // Validate estoque
  const resumo = [];
  for (const item of itens) {
    const produto = produtos.find(p => p.id === item.produtoId);
    if (!produto) return res.status(400).json({ error: `Produto não encontrado: ${item.produtoId}` });
    const qtd = Number(item.quantidade) || 0;
    if (qtd <= 0) return res.status(400).json({ error: `Quantidade inválida para produto ${produto.id}` });
    if (produto.estoque < qtd) return res.status(400).json({ error: `Estoque insuficiente para produto ${produto.id}` });
    resumo.push({ produto, quantidade: qtd, subtotal: produto.preco * qtd });
  }

  // Calcula total
  let subtotal = resumo.reduce((s,r)=>s + r.subtotal, 0);
  let desconto = 0;
  if (cupom && cupom.toUpperCase() === 'ALUNO10') {
    desconto = +(subtotal * 0.10).toFixed(2);
  }
  const total_final = +(subtotal - desconto).toFixed(2);

  // Baixa estoque
  for (const r of resumo) {
    const p = produtos.find(x => x.id === r.produto.id);
    p.estoque = p.estoque - r.quantidade;
  }

  // Cria pedido
  const pedido = { id: uuidv4(), total_final, data: new Date().toISOString(), itens: resumo.map(r=>({ produtoId: r.produto.id, nome: r.produto.nome, quantidade: r.quantidade, preco: r.produto.preco, subtotal: +r.subtotal.toFixed(2) })) };
  pedidos.push(pedido);

  res.status(201).json({ pedido, desconto, subtotal });
});

// Health
app.get('/', (req,res)=> res.send({ ok: true, version: 'vendaas-api-0.1' }));

app.listen(PORT, ()=>{
  console.log(`vendaas-api rodando na porta ${PORT}`);
});
