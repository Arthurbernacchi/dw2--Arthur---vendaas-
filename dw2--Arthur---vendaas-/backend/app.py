from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models
from .database import engine, Base, get_db
import uuid

Base.metadata.create_all(bind=engine)

app = FastAPI(title="vendaas-backend")

# Pydantic schemas
class ProdutoCreate(BaseModel):
    nome: str = Field(..., min_length=3, max_length=60)
    descricao: Optional[str]
    preco: float = Field(..., gt=0)
    estoque: int = Field(..., ge=0)
    categoria: str = Field(...)
    sku: Optional[str]

class ProdutoOut(ProdutoCreate):
    id: str

class ItemPedido(BaseModel):
    produtoId: str
    quantidade: int = Field(..., ge=1)

class CarrinhoConfirm(BaseModel):
    itens: List[ItemPedido]
    cupom: Optional[str]

class PedidoOut(BaseModel):
    id: str
    total_final: float
    data: str

# Endpoints
@app.get('/produtos', response_model=List[ProdutoOut])
def listar_produtos(search: Optional[str] = None, categoria: Optional[str] = None, sort: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Produto)
    if search:
        s = f"%{search.lower()}%"
        q = q.filter((models.Produto.nome.ilike(s)) | (models.Produto.descricao.ilike(s)) | (models.Produto.sku.ilike(s)))
    if categoria:
        q = q.filter(models.Produto.categoria == categoria)
    produtos = q.all()
    # simple sort
    if sort:
        if sort == 'preco_asc': produtos.sort(key=lambda x: x.preco)
        if sort == 'preco_desc': produtos.sort(key=lambda x: x.preco, reverse=True)
        if sort == 'nome_asc': produtos.sort(key=lambda x: x.nome)
        if sort == 'nome_desc': produtos.sort(key=lambda x: x.nome, reverse=True)
    return produtos

@app.post('/produtos', response_model=ProdutoOut, status_code=201)
def criar_produto(p: ProdutoCreate, db: Session = Depends(get_db)):
    novo = models.Produto(id=str(uuid.uuid4()), nome=p.nome, descricao=p.descricao, preco=p.preco, estoque=p.estoque, categoria=p.categoria, sku=p.sku)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.put('/produtos/{id}', response_model=ProdutoOut)
def atualizar_produto(id: str, p: ProdutoCreate, db: Session = Depends(get_db)):
    prod = db.query(models.Produto).filter(models.Produto.id == id).first()
    if not prod:
        raise HTTPException(status_code=404, detail='Produto não encontrado')
    prod.nome = p.nome
    prod.descricao = p.descricao
    prod.preco = p.preco
    prod.estoque = p.estoque
    prod.categoria = p.categoria
    prod.sku = p.sku
    db.commit()
    db.refresh(prod)
    return prod

@app.delete('/produtos/{id}')
def deletar_produto(id: str, db: Session = Depends(get_db)):
    prod = db.query(models.Produto).filter(models.Produto.id == id).first()
    if not prod:
        raise HTTPException(status_code=404, detail='Produto não encontrado')
    db.delete(prod)
    db.commit()
    return { 'ok': True }

@app.post('/carrinho/confirmar', response_model=PedidoOut, status_code=201)
def confirmar_carrinho(c: CarrinhoConfirm, db: Session = Depends(get_db)):
    # valida itens e estoque
    subtotal = 0.0
    updates = []
    for it in c.itens:
        prod = db.query(models.Produto).filter(models.Produto.id == it.produtoId).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f'Produto não encontrado: {it.produtoId}')
        if prod.estoque < it.quantidade:
            raise HTTPException(status_code=400, detail=f'Estoque insuficiente para produto {prod.id}')
        subtotal += prod.preco * it.quantidade
        updates.append((prod, it.quantidade))
    desconto = 0.0
    if c.cupom and c.cupom.upper() == 'ALUNO10':
        desconto = round(subtotal * 0.10, 2)
    total_final = round(subtotal - desconto, 2)
    # baixa estoque
    for prod, qtd in updates:
        prod.estoque -= qtd
    pedido = models.Pedido(id=str(uuid.uuid4()), total_final=total_final)
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return PedidoOut(id=pedido.id, total_final=pedido.total_final, data=str(pedido.data))
