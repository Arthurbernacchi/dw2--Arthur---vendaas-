const express = require('express');
const { v4: uuidv4 } = require('uuid');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

const DB_PATH = path.join(__dirname, '..', 'data', 'vendaas.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

function run(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL,
    estoque INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    sku TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY,
    total_final REAL NOT NULL,
    data TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS pedido_itens (
    id TEXT PRIMARY KEY,
    pedido_id TEXT NOT NULL,
    produto_id TEXT NOT NULL,
    nome TEXT,
    quantidade INTEGER,
    preco REAL,
    subtotal REAL
  )`);

  // Seed if empty
  const rows = await all('SELECT COUNT(1) as c FROM produtos');
  if (rows[0].c === 0) {
    const seeds = [
      // Papelaria
      ['Caderno 100 fls','Caderno universitário 100 folhas pautadas',12.5,50,'Papelaria','CAD-100'],
      ['Caderno 200 fls','Caderno universitário 200 folhas 10 matérias',24.9,40,'Papelaria','CAD-200'],
      ['Estojo Simples','Estojo escolar com zíper',19.9,40,'Papelaria','EST-01'],
      ['Lápis 2B','Lápis preto 2B',1.5,100,'Papelaria','LAP-2B'],
      ['Borracha Branca','Borracha macia branca',2.0,80,'Papelaria','BOR-01'],
      ['Apontador Metal','Apontador de metal com depósito',4.5,60,'Papelaria','APT-01'],
      ['Caneta Azul','Caneta esferográfica azul',2.5,120,'Papelaria','CAN-AZ'],
      
      // Livros
      ['Livro JavaScript','Livro prático de JavaScript moderno',99.0,5,'Livros','BK-JS-001'],
      ['Livro Python','Python para iniciantes',89.9,8,'Livros','BK-PY-001'],
      ['Atlas Geográfico','Atlas mundial atualizado',79.9,12,'Livros','BK-AT-001'],
      ['Dicionário Inglês','Dicionário inglês-português',45.0,15,'Livros','BK-DIC-01'],
      
      // Acessórios
      ['Mochila Escolar','Mochila 20L resistente com compartimento para notebook',129.9,15,'Acessórios','MOC-20'],
      ['Mochila Infantil','Mochila 15L estampada',89.9,20,'Acessórios','MOC-15'],
      ['Pasta A4','Pasta plástica com elástico formato A4',8.9,45,'Acessórios','PST-A4'],
      ['Régua 30cm','Régua acrílica transparente 30cm',3.5,70,'Acessórios','REG-30'],
      
      // Roupas
      ['Camiseta Algodão','Camiseta 100% algodão tamanho M uniforme',49.9,10,'Roupas','CAM-ALG-M'],
      ['Camiseta Polo','Polo uniforme escolar tamanho G',69.9,8,'Roupas','POL-G'],
      
      // Casa
      ['Caneca Cerâmica','Caneca cerâmica 300ml',29.5,25,'Casa','CAN-300'],
      ['Garrafa Térmica','Garrafa térmica 500ml',39.9,18,'Casa','GAR-500'],
      ['Porta Lápis','Porta lápis organizador de mesa',15.9,30,'Casa','PRT-01']
    ];
    for (const s of seeds) {
      await run('INSERT INTO produtos (id,nome,descricao,preco,estoque,categoria,sku) VALUES (?,?,?,?,?,?,?)', [uuidv4(), s[0], s[1], s[2], s[3], s[4], s[5]]);
    }
    console.log('Seeds inseridos (20 produtos)');
  }
}

function applySortSQL(sort) {
  if (!sort) return '';
  switch ((sort || '').toLowerCase()) {
    case 'preco_asc': return 'ORDER BY preco ASC';
    case 'preco_desc': return 'ORDER BY preco DESC';
    case 'nome_asc': return 'ORDER BY nome COLLATE NOCASE ASC';
    case 'nome_desc': return 'ORDER BY nome COLLATE NOCASE DESC';
    default: return '';
  }
}

// Endpoints
app.get('/produtos', async (req,res)=>{
  try {
    const { search, categoria, sort } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push('(nome LIKE ? OR descricao LIKE ? OR sku LIKE ?)');
      const q = `%${search}%`;
      params.push(q,q,q);
    }
    if (categoria) {
      where.push('categoria = ?');
      params.push(categoria);
    }
    const sql = `SELECT * FROM produtos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ${applySortSQL(sort)}`;
    const rows = await all(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/produtos', async (req,res)=>{
  try {
    const { nome, descricao, preco, estoque, categoria, sku } = req.body;
    if (!nome || preco == null || estoque == null || !categoria) return res.status(400).json({ error: 'Campos obrigatórios: nome, preco, estoque, categoria' });
    if (typeof nome !== 'string' || nome.length < 3 || nome.length > 60) return res.status(400).json({ error: 'nome deve ter entre 3 e 60 caracteres' });
    if (Number(preco) < 0.01) return res.status(400).json({ error: 'preco mínimo 0.01' });
    if (!Number.isInteger(Number(estoque)) || Number(estoque) < 0) return res.status(400).json({ error: 'estoque deve ser inteiro >= 0' });
    const id = uuidv4();
    await run('INSERT INTO produtos (id,nome,descricao,preco,estoque,categoria,sku) VALUES (?,?,?,?,?,?,?)', [id, nome, descricao||null, Number(preco), Number(estoque), categoria, sku||null]);
    const created = await all('SELECT * FROM produtos WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/produtos/:id', async (req,res)=>{
  try {
    const { id } = req.params;
    const exists = await all('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!exists.length) return res.status(404).json({ error: 'Produto não encontrado' });
    const p = exists[0];
    const { nome, descricao, preco, estoque, categoria, sku } = req.body;
    const updated = {
      nome: nome !== undefined ? nome : p.nome,
      descricao: descricao !== undefined ? descricao : p.descricao,
      preco: preco !== undefined ? Number(preco) : p.preco,
      estoque: estoque !== undefined ? Number(estoque) : p.estoque,
      categoria: categoria !== undefined ? categoria : p.categoria,
      sku: sku !== undefined ? sku : p.sku
    };
    await run('UPDATE produtos SET nome=?,descricao=?,preco=?,estoque=?,categoria=?,sku=? WHERE id=?', [updated.nome, updated.descricao, updated.preco, updated.estoque, updated.categoria, updated.sku, id]);
    const out = await all('SELECT * FROM produtos WHERE id = ?', [id]);
    res.json(out[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/produtos/:id', async (req,res)=>{
  try {
    const { id } = req.params;
    const existing = await all('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Produto não encontrado' });
    await run('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ ok: true, removed: existing[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/carrinho/confirmar', async (req,res)=>{
  try {
    const { itens, cupom } = req.body;
    if (!itens || !Array.isArray(itens) || itens.length === 0) return res.status(400).json({ error: 'Itens do carrinho são obrigatórios' });

    // Validate and build resumo
    const resumo = [];
    for (const item of itens) {
      const produtoRows = await all('SELECT * FROM produtos WHERE id = ?', [item.produtoId]);
      if (!produtoRows.length) return res.status(400).json({ error: `Produto não encontrado: ${item.produtoId}` });
      const produto = produtoRows[0];
      const qtd = Number(item.quantidade) || 0;
      if (qtd <= 0) return res.status(400).json({ error: `Quantidade inválida para produto ${produto.id}` });
      if (produto.estoque < qtd) return res.status(400).json({ error: `Estoque insuficiente para produto ${produto.id}` });
      resumo.push({ produto, quantidade: qtd, subtotal: produto.preco * qtd });
    }

    let subtotal = resumo.reduce((s,r)=>s + r.subtotal, 0);
    let desconto = 0;
    if (cupom && cupom.toUpperCase() === 'ALUNO10') desconto = +(subtotal * 0.10).toFixed(2);
    const total_final = +(subtotal - desconto).toFixed(2);

    // Create pedido
    const pedidoId = uuidv4();
    await run('INSERT INTO pedidos (id,total_final,data) VALUES (?,?,?)', [pedidoId, total_final, new Date().toISOString()]);
    for (const r of resumo) {
      // decrease stock
      await run('UPDATE produtos SET estoque = estoque - ? WHERE id = ?', [r.quantidade, r.produto.id]);
      const piId = uuidv4();
      await run('INSERT INTO pedido_itens (id,pedido_id,produto_id,nome,quantidade,preco,subtotal) VALUES (?,?,?,?,?,?,?)', [piId, pedidoId, r.produto.id, r.produto.nome, r.quantidade, r.produto.preco, +r.subtotal.toFixed(2)]);
    }

    res.status(201).json({ pedido: { id: pedidoId, total_final, data: new Date().toISOString() }, desconto, subtotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health + serve index
app.get('/health', (req,res)=> res.json({ ok: true, version: 'vendaas-api-0.1' }));

initDb().then(()=>{
  app.listen(PORT, ()=>{
    console.log(`vendaas-api rodando na porta ${PORT}`);
  });
}).catch(err=>{
  console.error('Erro inicializando DB', err);
  process.exit(1);
});
