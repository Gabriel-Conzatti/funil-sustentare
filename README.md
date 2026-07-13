# Funil Sustentare

CRM comercial configurável (funis, clientes, mensagens, auditoria) para a Sustentare.
Toda a estrutura é **dinâmica**: funis, etapas e mensagens são criados pelo administrador — nada fixo no código.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** com o design system **Kinetic Logic** (tema dark, mission-control)
- **Prisma ORM** — SQLite em desenvolvimento, **MySQL (Hostinger)** em produção
- **JWT** (access + refresh, cookies httpOnly) + **bcrypt**
- **Lucide Icons**
- **@hello-pangea/dnd** (Kanban drag-and-drop)

## Requisitos

- Node.js 18+ (testado no Node 24)

## Como rodar (desenvolvimento)

```powershell
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
Copy-Item .env.example .env   # (o .env já vem preenchido para dev)

# 3. Criar o banco (SQLite) e popular dados de exemplo
npm run setup

# 4. Iniciar o servidor
npm run dev
```

Acesse http://localhost:3000

### Credenciais iniciais (seed)

| Perfil | Usuário | Senha |
|--------|---------|-------|
| Administrador | `admin` | `Admin@123` |
| Consultor | `joao` | `Joao@123` |

> Troque as senhas e os segredos JWT antes de ir para produção.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run setup` | `db:push` + `db:seed` |
| `npm run db:studio` | Prisma Studio (inspeção do banco) |
| `npm run db:seed` | Popular dados de exemplo |

## Produção (MySQL / Hostinger)

1. Em `prisma/schema.prisma`, troque o `provider` do datasource de `sqlite` para `mysql`.
2. Ajuste `DATABASE_URL` no `.env` para a string MySQL da Hostinger:
   ```
   DATABASE_URL="mysql://USUARIO:SENHA@HOST:3306/BANCO"
   ```
3. Gere segredos JWT fortes (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
4. Rode `npm run db:push` (ou `prisma migrate deploy`) e `npm run build`.

## Estrutura

```
src/
  app/
    (app)/           # Área autenticada (layout com sidebar/header)
      dashboard/     # Indicadores e KPIs em tempo real
      clientes/      # Cadastro, listagem, busca, duplicidade
      funis/         # Construtor de funis + Kanban drag-and-drop
      mensagens/     # Editor com variáveis + preview WhatsApp
      usuarios/      # Listagem de usuários
      auditoria/     # Logs imutáveis
    api/auth/        # login / logout / me (JWT)
    login/           # Tela de login
  components/        # Sidebar, Header, PageHeader
  lib/               # auth, prisma, audit, utils, constants
  middleware.ts      # Proteção de rotas
prisma/
  schema.prisma      # Modelo completo do banco
  seed.ts            # Dados iniciais
```

## Princípios aplicados (conforme especificação)

- **Nada fixo**: funis, etapas e mensagens 100% configuráveis.
- **Soft delete**: registros nunca são apagados (`deletedAt`).
- **Histórico e auditoria** em toda ação relevante (`ClientHistory`, `AuditLog`).
- **Segurança**: senhas com bcrypt, JWT, validação/sanitização de entradas.
- **WhatsApp** via `wa.me` com variáveis substituídas; estrutura pronta para APIs futuras.

## Funcionalidades implementadas nesta base

- Autenticação JWT (login, logout, bloqueio por tentativas, sessões, auditoria)
- Dashboard com cards, KPIs, gráfico de funil e ranking
- Clientes: cadastro inteligente (formatação de telefone, DDD), detecção de duplicidade, busca, filtros
- Construtor de funis: criação de funis/etapas, Kanban com **drag-and-drop** e histórico
- Editor de mensagens: variáveis dinâmicas, inserção rápida e preview estilo WhatsApp
- Envio via `wa.me` a partir dos cards com mensagem-padrão da etapa
- Auditoria e histórico do cliente

## Próximos passos sugeridos

- Página de detalhe do cliente (timeline, observações, tags, mudança de responsável)
- Importação CSV/Excel com mapeamento de colunas
- Versionamento/comparação de mensagens e templates reutilizáveis
- Metas e relatórios exportáveis (PDF)
- Integração com WhatsApp Business/Evolution/Z-API (a estrutura já está preparada)
