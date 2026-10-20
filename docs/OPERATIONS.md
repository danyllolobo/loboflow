# LoboFlow — Guia de Operações, Backups, Restauração e Resolução de Problemas

## 1. Rotinas de Backup

### 1.1 Backup do PostgreSQL
O backup do banco de dados deve ser executado diariamente via cron job em formato comprimido binário (`pg_dump -Fc`):

```bash
# Executa dump completo do banco
pg_dump -h 127.0.0.1 -U postgres -d loboflow -Fc -f "/var/backups/loboflow_$(date +%Y%m%d_%H%M%S).dump"
```

### 1.2 Verificação e Restauração de Backup
Nunca confie em um backup sem testar a restauração em ambiente isolado:
```bash
# Cria banco de teste
createdb -h 127.0.0.1 -U postgres loboflow_restore_test

# Restaura o dump
pg_restore -h 127.0.0.1 -U postgres -d loboflow_restore_test "/var/backups/loboflow_YYYYMMDD_HHMMSS.dump"

# Valida integridade
psql -h 127.0.0.1 -U postgres -d loboflow_restore_test -c "SELECT count(*) FROM \"Organization\";"
```

## 2. Healthchecks e Observabilidade
- `GET /api/v1/health`: Verifica status da API, conectividade com o banco PostgreSQL e saúde do Redis.
- `GET /api/v1/health/liveness`: Retorna HTTP 200 rápido para orquestradores (Docker/EasyPanel).
- Logs formatados em JSON estruturado com correlação por `requestId`.

## 3. Solução de Problemas Comuns (Troubleshooting)

### Banco não conecta ou migração falha:
- Verifique se o PostgreSQL está ativo: `pg_isready -h 127.0.0.1 -p 5432`.
- Confirme a variável `DATABASE_URL` no arquivo `.env`.

### Erro de CORS na API:
- Verifique se a variável `CORS_ORIGINS` contém a URL exata do frontend (sem barra final), por exemplo: `http://localhost:5173`.
