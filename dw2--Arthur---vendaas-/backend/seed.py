from .database import engine
from .models import Produto
from .database import Base, SessionLocal
import uuid

Base.metadata.create_all(bind=engine)

produtos = [
    { 'nome': 'Camiseta Algodão', 'descricao': 'Camiseta 100% algodão', 'preco': 49.9, 'estoque': 10, 'categoria': 'Roupas', 'sku': 'CAM-ALG-001' },
    { 'nome': 'Caneca Cerâmica', 'descricao': 'Caneca 300ml', 'preco': 29.5, 'estoque': 25, 'categoria': 'Casa', 'sku': 'CAN-300' },
    { 'nome': 'Livro JavaScript', 'descricao': 'Livro prático', 'preco': 99.0, 'estoque': 5, 'categoria': 'Livros', 'sku': 'BK-JS-001' },
    { 'nome': 'Agenda 2026', 'descricao': 'Agenda anual 2026', 'preco': 19.9, 'estoque': 30, 'categoria': 'Papelaria', 'sku': 'AG-2026' },
    { 'nome': 'Mochila Escolar', 'descricao': 'Mochila 20L resistente', 'preco': 129.0, 'estoque': 8, 'categoria': 'Acessórios', 'sku': 'MOC-20L' },
    { 'nome': 'Caderno 100 folhas', 'descricao': 'Caderno espiral', 'preco': 9.9, 'estoque': 100, 'categoria': 'Papelaria', 'sku': 'CAD-100' },
    { 'nome': 'Estojo Simples', 'descricao': 'Estojo tecido', 'preco': 15.0, 'estoque': 50, 'categoria': 'Acessórios', 'sku': 'EST-001' },
    { 'nome': 'Lápis HB (12)', 'descricao': 'Lápis grafite HB pack com 12', 'preco': 12.5, 'estoque': 200, 'categoria': 'Papelaria', 'sku': 'LP-HB-12' },
    { 'nome': 'Borracha', 'descricao': 'Borracha macia', 'preco': 3.5, 'estoque': 150, 'categoria': 'Papelaria', 'sku': 'BR-01' },
    { 'nome': 'Caneta Esferográfica', 'descricao': 'Caneta azul', 'preco': 2.5, 'estoque': 300, 'categoria': 'Papelaria', 'sku': 'CAN-AZ' },
    { 'nome': 'Calculadora Básica', 'descricao': 'Calculadora 8 dígitos', 'preco': 39.9, 'estoque': 20, 'categoria': 'Eletrônicos', 'sku': 'CALC-8' },
    { 'nome': 'Fone de Ouvido', 'descricao': 'Fone intra-auricular', 'preco': 59.9, 'estoque': 15, 'categoria': 'Eletrônicos', 'sku': 'FONE-01' },
    { 'nome': 'Garrafa Térmica', 'descricao': '500ml inox', 'preco': 79.0, 'estoque': 12, 'categoria': 'Casa', 'sku': 'GRT-500' },
    { 'nome': 'Camiseta Escola', 'descricao': 'Uniforme oficial', 'preco': 39.9, 'estoque': 40, 'categoria': 'Roupas', 'sku': 'UNI-001' },
    { 'nome': 'Máscara Reutilizável', 'descricao': 'Máscara tecido', 'preco': 9.0, 'estoque': 120, 'categoria': 'Higiene', 'sku': 'MSK-01' },
    { 'nome': 'Álcool Gel', 'descricao': 'Álcool 70% 500ml', 'preco': 14.5, 'estoque': 60, 'categoria': 'Higiene', 'sku': 'AG-500' },
    { 'nome': 'Moleskine Pequeno', 'descricao': 'Caderno premium', 'preco': 59.9, 'estoque': 18, 'categoria': 'Papelaria', 'sku': 'MOL-P' },
    { 'nome': 'Estojo Mega', 'descricao': 'Estojo grande para materiais', 'preco': 39.0, 'estoque': 25, 'categoria': 'Acessórios', 'sku': 'EST-M' },
    { 'nome': 'Placa de Quadro Branco', 'descricao': '30x40cm', 'preco': 49.0, 'estoque': 10, 'categoria': 'Sala', 'sku': 'QBR-3040' },
    { 'nome': 'Kit Escolar', 'descricao': 'Conjunto caneta, lápis e borracha', 'preco': 29.9, 'estoque': 80, 'categoria': 'Papelaria', 'sku': 'KIT-ESC-01' },
]

db = SessionLocal()
for p in produtos:
    prod = Produto(id=str(uuid.uuid4()), nome=p['nome'], descricao=p['descricao'], preco=p['preco'], estoque=p['estoque'], categoria=p['categoria'], sku=p['sku'])
    db.add(prod)

db.commit()
print('seed aplicado')
