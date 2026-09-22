# 🤖 ÍRIS — Sistema de Agendamento e Automação

Sistema de agendamentos para a **ProCert Certificadora** e o setor **Administrativo**, com notificações via WhatsApp Business Cloud API (Meta).

Este pacote entrega a **FASE 1** completa:
- Estrutura do projeto (backend + frontend separados)
- Banco de dados (Prisma/PostgreSQL) com todas as tabelas do domínio
- Login (JWT)
- Dashboard com indicadores e agenda do dia
- Cadastro e pesquisa de clientes
- Setores e serviços (com seed inicial dos serviços da ProCert)
- Agenda por dia com criação de agendamento (fluxo em etapas)
- Confirmar / Iniciar atendimento / Marcar como realizado / Cancelar / Reagendar
- Validação de conflito de horário e de horário de expediente
- Histórico de status por agendamento (`appointment_status_history`)
- **WhatsAppService já implementado** contra a Cloud API oficial da Meta (não QR Code) — dispara automaticamente ao criar, cancelar e reagendar um atendimento, e registra tudo em `whatsapp_messages`

> ⚠️ Este ambiente de desenvolvimento (onde o código foi escrito) não tem acesso à internet, então não foi possível rodar `npm install` nem subir o app aqui para testar ao vivo. O código foi revisado manualmente, mas rode os passos abaixo na sua máquina para validar.

---

## 1. Pré-requisitos

- Node.js 18 ou superior
- Docker (opcional, mais fácil) OU PostgreSQL instalado localmente

## 2. Subir o banco de dados

Usando Docker (mais simples):

```bash
docker compose up -d
```

Isso sobe um Postgres em `localhost:5432` com usuário `iris`, senha `iris_dev_password`, banco `iris_db` (já configurado no `.env.example` do backend).

Se preferir um Postgres já instalado, crie um banco `iris_db` e ajuste a `DATABASE_URL` no `.env` do backend.

## 3. Configurar e rodar o backend

```bash
cd backend
cp .env.example .env
```

Abra o `.env` e preencha:

- `JWT_SECRET` — qualquer string longa e aleatória
- `WHATSAPP_ACCESS_TOKEN` — o token da sua conta WhatsApp Business Cloud API
- `WHATSAPP_PHONE_NUMBER_ID` — o Phone Number ID da Meta
- `WHATSAPP_RECIPIENT_PHONE` — seu número (formato internacional, ex: `5531999999999`), para onde as notificações vão
- `WHATSAPP_NOTIFICATIONS_ENABLED=true` — quando quiser ativar o envio de fato (comece com `false` para testar sem gastar mensagens)

Depois:

```bash
npm install
npm run prisma:migrate     # cria as tabelas no banco (vai pedir um nome pra migration, ex: init)
npm run prisma:seed        # cria setores, serviços da ProCert e o usuário admin
npm run dev                # sobe o backend em http://localhost:3333
```

O `prisma:seed` imprime no terminal o e-mail e a senha do usuário admin criado (padrão: `admin@iris.local` / `TrocarSenha123!` — **troque depois**, ou defina `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` no `.env` antes de rodar o seed).

## 4. Configurar e rodar o frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Acesse **http://localhost:5173** e faça login com o usuário admin criado no seed.

---

## 5. Testando o fluxo

1. Faça login.
2. Vá em **Clientes** → cadastre um cliente.
3. Vá em **Agenda** → "+ Novo agendamento" → selecione cliente, setor (Administrativo ou ProCert), serviço, data/horário e modalidade → Salvar.
4. Se `WHATSAPP_NOTIFICATIONS_ENABLED=true` e as credenciais estiverem certas, você recebe a mensagem "🤖 ÍRIS — NOVO AGENDAMENTO" no seu WhatsApp.
5. Teste também **Confirmar**, **Reagendar** e **Cancelar** — cada um dispara sua mensagem correspondente e grava no histórico.
6. Tente criar dois agendamentos no mesmo horário e setor — o sistema deve bloquear com "Já existe um atendimento agendado para este horário."
7. Tente criar um agendamento fora do horário de expediente (ex: 20h) — deve bloquear (só o ADMIN pode passar `allowOutsideBusinessHours: true`, hoje isso está no backend, um toggle na tela pode ser adicionado na Fase 2).

---

## 6. Variáveis de ambiente — resumo

**Backend (`backend/.env`)**
```
DATABASE_URL, PORT, NODE_ENV, TIMEZONE, JWT_SECRET, JWT_EXPIRES_IN,
SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD,
WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID,
WHATSAPP_RECIPIENT_PHONE, WHATSAPP_API_VERSION, WHATSAPP_NOTIFICATIONS_ENABLED,
FRONTEND_URL
```

**Frontend (`frontend/.env`)**
```
VITE_API_URL
```

---

## 7. Estrutura de pastas

```
iris/
├── docker-compose.yml          # Postgres local
├── backend/
│   ├── prisma/schema.prisma    # Banco de dados (10 tabelas)
│   ├── prisma/seed.ts          # Dados iniciais
│   └── src/
│       ├── config/             # env, prisma client
│       ├── middleware/         # auth (JWT), tratamento de erros
│       ├── services/           # appointment.service (regras de horário/conflito),
│       │                       # whatsapp.service (Cloud API), audit.service
│       ├── controllers/        # auth, client, sector, service, appointment, dashboard
│       └── routes/             # endpoints REST organizados por domínio
└── frontend/
    └── src/
        ├── api/client.ts       # axios + token JWT
        ├── context/AuthContext.tsx
        ├── components/         # Sidebar, Layout, StatusBadge
        └── pages/               # Login, Dashboard, Clients, Agenda
```

---

## 8. O que NÃO está nesta versão (por decisão de fases)

- Módulo de **Usuários** (tela de gestão) — hoje só existe o usuário admin do seed. A tabela `users` e os papéis `ADMIN`/`OPERADOR` já estão prontos no banco e na autenticação; falta só a tela de CRUD (Fase 2).
- Tela de **Configurações** (empresa, horários, WhatsApp via UI) — hoje isso é feito via `.env` e `system_settings` diretamente no banco. Fase 2.
- **Relatórios** e exportação Excel/PDF/CSV — Fase 2.
- **Lembretes automáticos** (24h/2h/30min) via cron — a tabela `whatsapp_messages` e o `WhatsAppService` já suportam isso, falta o worker agendado (Fase 3, mas o `node-cron` já está nas dependências do backend para isso).
- **Calendário visual** (mês/semana) — hoje a Agenda é por dia; dá pra evoluir para uma lib como `react-big-calendar` sem mexer no backend.
- **Comandos via WhatsApp** ("ÍRIS, quais meus agendamentos de hoje?") — Fase 4, arquitetura já preparada (WhatsAppService isolado + endpoints REST reaproveitáveis).

## 9. Próxima etapa sugerida

Testar esta Fase 1 na sua máquina (banco, backend, frontend, fluxo completo de agendamento) e me confirmar. Aí eu sigo para a **Fase 2**: tela de Usuários, Configurações, Histórico detalhado na interface e Relatórios.
