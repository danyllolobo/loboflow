# LoboFlow — Arquitetura de Segurança, Autenticação e Isolamento

## 1. Princípios de Segurança
- **Defesa em Profundidade:** A segurança não depende de uma única barreira. A proteção é exercida no roteamento, nos guards do NestJS, nos serviços de domínio e nas constraints relacionais do PostgreSQL.
- **Zero-Trust com Entrada de Dados:** Nenhum input do cliente é considerado confiável. Todos os payloads passam por validação estrita via schemas Zod antes de atingirem a camada de negócio.
- **Frontend como Interface Passiva:** O frontend oculta botões com base nas permissões do usuário apenas para melhorar a ergonomia, mas toda e qualquer autorização é rigorosamente validada no servidor.

## 2. Autenticação e Gestão de Sessões
- **Hashing de Senhas:** Utilização de **Argon2id** (`@node-rs/argon2`), algoritmo recomendado pela OWASP para proteção contra ataques com GPU e tabelas rainbow.
- **Sessões no Servidor:** Identificadores opacos de sessão criptograficamente aleatórios armazenados no PostgreSQL com hash SHA-256 e transmitidos exclusivamente via Cookie seguro:
  - `HttpOnly: true` (inacessível via scripts no navegador / previne roubo por XSS).
  - `Secure: true` (obrigatório em produção com HTTPS).
  - `SameSite: 'Lax'` (proteção nativa contra Cross-Site Request Forgery - CSRF).
- **Proteção Contra Força Bruta:** Rate limiting através do `@nestjs/throttler` em rotas sensíveis (`/auth/login`, `/auth/register`, `/auth/forgot-password`) com bloqueio temporário após tentativas consecutivas inválidas.

## 3. Isolamento Multi-Tenant
1. **Resolução de Organização:** O tenant ativo é identificado pelo header `x-organization-id` e validado contra a tabela `Membership` do usuário autenticado.
2. **Impedimento de Spoofing:** O backend rejeita qualquer tentativa de injetar identificador de organização à qual o usuário não pertença ativamente.
3. **Escopo RBAC:** As permissões possuem controle de escopo:
   - `ALL`: Todos os registros da organização.
   - `ASSIGNED`: Apenas registros onde o usuário é participante/responsável.
   - `OWN`: Apenas registros criados pelo próprio usuário.

## 4. Proteção contra SSRF e Webhooks
- Webhooks enviados pelo LoboFlow passam por validação de URL de destino com resolução DNS prévia.
- Destinos apontando para loopback (`127.0.0.1`, `localhost`), IPs privados (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) ou metadados de nuvem (`169.254.169.254`) são bloqueados preventivamente em produção.
- Cada payload de webhook é assinado com HMAC-SHA256 utilizando segredo exclusivo da organização, permitindo que o consumidor valide a autenticidade e integridade da mensagem.

## 5. Criptografia de Dados Sensíveis
- Segredos corporativos (chaves de API de terceiros, senhas SMTP, segredos de webhook) são cifrados no banco com **AES-256-GCM** utilizando a `ENCRYPTION_KEY` definida no ambiente.
- As chaves reais nunca são expostas em texto claro na API ou nos logs estruturados.
