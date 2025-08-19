# vendaas-api

API de exemplo para Vendas de Produtos (em memória).

Endpoints implementados:

- GET /produtos?search=&categoria=&sort=
  - search: busca por nome, descricao ou sku
  - categoria: filtra por categoria (exata)
  - sort: preco_asc | preco_desc | nome_asc | nome_desc | estoque_asc | estoque_desc
- POST /produtos
- PUT /produtos/{id}
- DELETE /produtos/{id}
- POST /carrinho/confirmar
  - body: { itens: [{ produtoId, quantidade }], cupom?: string }
  - valida estoque; aplica cupom "ALUNO10" (10% de desconto); baixa estoque; cria pedido

Como rodar (PowerShell):

```powershell
cd "C:\Users\arthur_bernacchi\Av2Bm3\dw2--Arthur---vendaas-"
npm install
npm start
```

Observações:
- Este projeto usa armazenamento em memória — reiniciar o servidor reseta os dados.
- Requer Node.js + npm instalados localmente.
