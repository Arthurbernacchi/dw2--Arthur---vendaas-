# vendaas-api (Loja Escolar)

Projeto exemplo para disciplina: sistema de Vendas de Produtos (frontend estático + backend FastAPI + SQLite).

Estrutura do projeto:

- `frontend/`: arquivos estáticos do frontend
- `backend/`: código fonte do backend em Python

## Como rodar

Veja `REPORT.md` para instruções completas. Basicamente:

- Backend: criar virtualenv, instalar `backend/requirements.txt`, executar `python -m backend.seed` e `uvicorn backend.app:app --reload --port 8000`.
- Frontend: abra `frontend/index.html` no navegador e interaja com a API.

## Observações

- Seed adiciona ~20 produtos.
- Use `backend/requests.http` para testar a API.

---

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

## Como rodar (PowerShell):

```powershell
cd "C:\Users\arthur_bernacchi\Av2Bm3\dw2--Arthur---vendaas-"
npm install
npm start
```

## Observações:
- Este projeto usa armazenamento em memória — reiniciar o servidor reseta os dados.
- Requer Node.js + npm instalados localmente.
