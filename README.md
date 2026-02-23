# Estoque Inteligente API

Back-end para gerenciamento de estoque inteligente.

## Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Executando o Projeto](#-executando-o-projeto)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Testes](#-testes)
- [Docker](#-docker)
- [Documentação](#-documentação)
- [Contribuição](#-contribuição)

## Funcionalidades

- **Gestão de Usuários**: Cadastro, autenticação e controle de acesso
- **Gerenciamento de Itens**: CRUD completo de itens do estoque
- **Controle de Estoque**: Monitoramento de quantidades e alertas de estoque mínimo
- **Organização por Categorias**: Classificação de itens por categoria
- **Localização de Itens**: Controle de onde cada item está armazenado
- **Fornecedores**: Gestão de dados de fornecedores
- **Movimentações**: Histórico de entradas e saídas de estoque
- **Orçamentos**: Sistema de orçamentação com itens
- **Notificações**: Sistema de notificações para alertas

## Tecnologias Utilizadas

### Backend

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação e autorização
- **Bcrypt** - Criptografia de senhas
- **Swagger** - Documentação da API
- **Docker** - Containerização

### Desenvolvimento

- **Jest** - Framework de testes
- **ESLint** - Linter para JavaScript
- **Nodemon** - Hot reload em desenvolvimento

## Instalação

### Pré-requisitos

- Node.js (versão 18 ou superior)
- MongoDB (local ou Atlas)
- Git

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Porta em que o servidor irá rodar
PORT=3010

# URL de conexão com o banco MongoDB
# Exemplos:
#   Local:  mongodb://localhost:27017/estoque-inteligente
#   Atlas:  mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/estoque-inteligente?retryWrites=true&w=majority
DB_URL="sua_url"

# URL de conexão com o banco de testes (opcional)
DB_URL_TEST="sua_url_de_teste"

# Ambiente da aplicação: development, test ou production
NODE_ENV=development

# Ativa/desativa logs detalhados (true ou false)
DEBUGLOG=true

# Secrets para autenticação JWT
JWT_SECRET_ACCESS_TOKEN="sua_chave_secreta_access"
JWT_SECRET_REFRESH_TOKEN="sua_chave_secreta_refresh"
JWT_SECRET_PASSWORD_RECOVERY="sua_chave_secreta_recuperacao"

# Tempo de expiração dos tokens JWT
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Chave de API para serviço de envio de e-mails
MAIL_API_KEY="sua_api_key"

# URL base do serviço de envio de e-mails
MAIL_API_URL=http://localhost:3001
```

### Configuração do Banco de Dados

O sistema se conecta automaticamente ao MongoDB usando a URI fornecida no arquivo `.env`.

## Executando o Projeto

### Desenvolvimento

```bash
# Iniciar em modo desenvolvimento (com hot reload)
npm run dev
```

### Produção

```bash
# Iniciar em modo produção
npm start
```

### Populando o Banco com Dados de Teste

```bash
# Executar seeds para popular o banco
npm run seed
```

### Executando Testes

```bash
# Executar todos os testes com coverage
npm test
```

## Docker

### Executando com Docker Compose

```bash
# Subir a API com MongoDB e MinIO
docker compose up --build

# Ou em modo detached (background)
docker compose up -d --build

# Rodar API + Frontend (se estiver na mesma pasta pai)
docker compose -f docker-compose.full.yml up --build

# Parar os containers
docker compose down

# Remover volumes (apagar dados)
docker compose down -v
```

## Estrutura do Projeto

```
estoque-inteligente-api/
├── src/
│   ├── app.js                 # Configuração principal da aplicação
│   ├── config/
│   │   └── DbConnect.js       # Configuração do banco de dados
│   ├── controllers/           # Controladores das rotas
│   ├── middlewares/           # Middlewares personalizados
│   ├── models/                # Modelos do MongoDB/Mongoose
│   ├── repositories/          # Camada de acesso aos dados
│   ├── routes/                # Definição das rotas
│   ├── services/              # Lógica de negócio
│   ├── seeds/                 # Scripts para popular o banco
│   ├── tests/                 # Testes unitários e de integração
│   ├── docs/                  # Configurações do Swagger
│   └── utils/                 # Utilitários e helpers
├── documentacao/            # Documentação do projeto/desenvolvimento
├── docker-compose.yml       # Configuração Docker Compose
├── Dockerfile               # Configuração Docker
├── package.json             # Dependências e scripts
├── jest.setup.js            # Configuração do Jest
├── eslint.config.mjs        # Configuração do ESLint
├── README.md                # Este arquivo
└── server.js                # Servidor que roda a aplicação
```

## API Endpoints

### Autenticação

- `POST /auth/login` - Login de usuário

### Usuários

- `GET /usuarios` - Listar usuários
- `GET /usuarios/:id` - Buscar usuário por ID
- `POST /usuarios` - Criar usuário
- `PUT /usuarios/:id` - Atualizar usuário
- `DELETE /usuarios/:id` - Excluir usuário

### Itens

- `GET /itens` - Listar itens
- `GET /itens/:id` - Buscar item por ID
- `POST /itens` - Criar item
- `PUT /itens/:id` - Atualizar item
- `DELETE /itens/:id` - Excluir item

### Categorias

- `GET /categorias` - Listar categorias
- `GET /categorias/:id` - Buscar categoria por ID
- `POST /categorias` - Criar categoria
- `PUT /categorias/:id` - Atualizar categoria
- `DELETE /categorias/:id` - Excluir categoria

### Fornecedores

- `GET /fornecedores` - Listar fornecedores
- `GET /fornecedores/:id` - Buscar fornecedor por ID
- `POST /fornecedores` - Criar fornecedor
- `PUT /fornecedores/:id` - Atualizar fornecedor
- `DELETE /fornecedores/:id` - Excluir fornecedor

### Localizações

- `GET /localizacoes` - Listar localizações
- `GET /localizacoes/:id` - Buscar localização por ID
- `POST /localizacoes` - Criar localização
- `PUT /localizacoes/:id` - Atualizar localização
- `DELETE /localizacoes/:id` - Excluir localização

### Movimentações

- `GET /movimentacoes` - Listar movimentações
- `GET /movimentacoes/:id` - Buscar movimentação por ID
- `POST /movimentacoes` - Criar movimentação

### Orçamentos

- `GET /orcamentos` - Listar orçamentos
- `GET /orcamentos/:id` - Buscar orçamento por ID
- `POST /orcamentos` - Criar orçamento
- `PUT /orcamentos/:id` - Atualizar orçamento
- `DELETE /orcamentos/:id` - Excluir orçamento

### Notificações

- `GET /notificacoes` - Listar notificações
- `GET /notificacoes/:id` - Buscar notificação por ID
- `POST /notificacoes` - Criar notificação
- `PUT /notificacoes/:id` - Marcar como lida
- `DELETE /notificacoes/:id` - Excluir notificação

> **Documentação Completa**: Acesse `/docs` quando o servidor estiver rodando para ver a documentação completa da API com Swagger.

## Testes

O projeto utiliza Jest para testes unitários e de integração.

### Executar Testes

```bash
# Executar todos os testes
npm run test
```

### Estrutura de Testes

```
src/tests/
├── unit/          # Testes unitários
└── routes/        # Testes de integração das rotas
```
