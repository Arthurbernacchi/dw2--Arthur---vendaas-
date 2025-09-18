from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from .database import Base

class Produto(Base):
    __tablename__ = 'produtos'
    id = Column(String, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)
    preco = Column(Float, nullable=False)
    estoque = Column(Integer, nullable=False, default=0)
    categoria = Column(String, nullable=False)
    sku = Column(String, nullable=True)

class Pedido(Base):
    __tablename__ = 'pedidos'
    id = Column(String, primary_key=True, index=True)
    total_final = Column(Float, nullable=False)
    data = Column(DateTime(timezone=True), server_default=func.now())
