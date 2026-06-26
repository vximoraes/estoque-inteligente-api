import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import commonResponses from '../../utils/openapi/commonResponses.js';

registry.register(
  'LoginRequest',
  z.object({
    email: z.string().email().openapi({ example: 'usuario@email.com' }),
    senha: z.string().min(8).openapi({ example: 'Senha@123' }),
  }),
);

registry.register(
  'SignupRequest',
  z.object({
    nome: z.string().min(3).openapi({ example: 'João Silva' }),
    email: z.string().email().openapi({ example: 'usuario@email.com' }),
    senha: z.string().min(8).openapi({ example: 'Senha@123', description: 'Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número' }),
  }),
);

registry.register(
  'TokenRequest',
  z.object({
    refreshtoken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
  }),
);

registry.register(
  'IntrospectRequest',
  z.object({
    accesstoken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
  }),
);

registry.register(
  'RecoverRequest',
  z.object({
    email: z.string().email().openapi({ example: 'usuario@email.com' }),
  }),
);

registry.register(
  'LoginResponse',
  z.object({
    accesstoken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    refreshtoken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    usuario: z.object({
      _id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      nome: z.string().openapi({ example: 'João Silva' }),
      email: z.string().openapi({ example: 'usuario@email.com' }),
    }),
  }),
);

registry.register(
  'SignupResponse',
  z.object({
    _id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    nome: z.string().openapi({ example: 'João Silva' }),
    email: z.string().openapi({ example: 'usuario@email.com' }),
    ativo: z.boolean().openapi({ example: false }),
  }),
);

registry.register(
  'RefreshResponse',
  z.object({
    accesstoken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
  }),
);

registry.register(
  'IntrospectResponse',
  z.object({
    active: z.boolean().openapi({ example: true }),
    sub: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    exp: z.number().openapi({ example: 1705318200 }),
    iat: z.number().openapi({ example: 1705317300 }),
  }),
);

const authErrorResponse = {
  description: 'Erro de autenticação',
  content: {
    'application/json': {
      schema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

registerPaths({
  '/login': {
    post: {
      tags: ['Auth'],
      summary: 'Realizar login no sistema',
      description: `
            + **Caso de uso**: Autenticação de usuário no sistema.

            + **Regras de Negócio**:
                - Email deve estar cadastrado no sistema.
                - Senha deve corresponder ao hash armazenado.
                - Usuário deve estar ativo (ativo: true).
                - Retorna access token com validade de 15 minutos.
                - Retorna refresh token com validade de 7 dias.

            + **Resultado Esperado**:
                - HTTP 200 OK com dados do usuário e tokens.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/LoginResponse'),
        400: commonResponses[400]!(),
        401: authErrorResponse,
        403: { description: 'Usuário inativo', content: authErrorResponse.content },
        500: commonResponses[500]!(),
      },
    },
  },

  '/signup': {
    post: {
      tags: ['Auth'],
      summary: 'Cadastrar novo usuário',
      description: `
            + **Caso de uso**: Registro de novo usuário no sistema.

            + **Regras de Negócio**:
                - Nome deve ter no mínimo 3 caracteres.
                - Email deve ser único e válido.
                - Senha deve ter no mínimo 8 caracteres com pelo menos 1 maiúscula, 1 minúscula e 1 número.
                - Usuário criado com status inativo por padrão (ativo: false).

            + **Resultado Esperado**:
                - HTTP 201 Created com dados do usuário criado.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } },
      },
      responses: {
        201: commonResponses[201]!('#/components/schemas/SignupResponse'),
        400: commonResponses[400]!(),
        409: commonResponses[409]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Realizar logout',
      description: `
            + **Caso de uso**: Invalidar tokens de acesso do usuário.

            + **Regras de Negócio**:
                - Requer refresh token válido no corpo da requisição.
                - Remove tokens de acesso e renovação do banco.

            + **Resultado Esperado**:
                - HTTP 200 OK com mensagem de confirmação.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenRequest' } } },
      },
      responses: {
        200: commonResponses[200]!(),
        400: commonResponses[400]!(),
        401: authErrorResponse,
        500: commonResponses[500]!(),
      },
    },
  },

  '/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Renovar access token',
      description: `
            + **Caso de uso**: Gerar novo access token usando refresh token.

            + **Regras de Negócio**:
                - Refresh token deve ser válido e não expirado.
                - Usuário deve estar ativo.
                - Novo access token tem validade de 15 minutos.

            + **Resultado Esperado**:
                - HTTP 200 OK com novo access token.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenRequest' } } },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/RefreshResponse'),
        400: commonResponses[400]!(),
        401: authErrorResponse,
        500: commonResponses[500]!(),
      },
    },
  },

  '/revoke': {
    post: {
      tags: ['Auth'],
      summary: 'Revogar refresh token',
      description: `
            + **Caso de uso**: Invalidar refresh token específico.

            + **Regras de Negócio**:
                - Refresh token deve existir no sistema.
                - Remove token do banco de dados.
                - Invalida sessão associada ao token.

            + **Resultado Esperado**:
                - HTTP 200 OK com mensagem de confirmação.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenRequest' } } },
      },
      responses: {
        200: commonResponses[200]!(),
        400: commonResponses[400]!(),
        404: commonResponses[404]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/introspect': {
    post: {
      tags: ['Auth'],
      summary: 'Validar access token',
      description: `
            + **Caso de uso**: Verificar validade e obter informações de um access token (RFC 7662).

            + **Regras de Negócio**:
                - Token deve ser válido e não expirado.
                - Retorna informações estruturadas do token.
                - Em caso de token inválido, retorna dados com active: false.

            + **Resultado Esperado**:
                - HTTP 200 OK com informações do token.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/IntrospectRequest' } } },
      },
      responses: {
        200: commonResponses[200]!('#/components/schemas/IntrospectResponse'),
        400: commonResponses[400]!(),
        500: commonResponses[500]!(),
      },
    },
  },

  '/recover': {
    post: {
      tags: ['Auth'],
      summary: 'Solicitar recuperação de senha',
      description: `
            + **Caso de uso**: Iniciar processo de recuperação de senha.

            + **Regras de Negócio**:
                - Email deve estar cadastrado no sistema.
                - Gera token único de recuperação com validade limitada.
                - Envia email com instruções de recuperação.

            + **Resultado Esperado**:
                - HTTP 200 OK com mensagem de confirmação.
            `,
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/RecoverRequest' } } },
      },
      responses: {
        200: commonResponses[200]!(),
        400: commonResponses[400]!(),
        404: commonResponses[404]!(),
        500: commonResponses[500]!(),
      },
    },
  },
});
