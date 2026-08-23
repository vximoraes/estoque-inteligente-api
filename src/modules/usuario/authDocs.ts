import { z } from 'zod';
import { registry, registerPaths } from '../../utils/openapi/registry.js';
import {
  objectIdField,
  timestampFields,
} from '../../utils/openapi/commonSchemas.js';

const AuthUsuario = registry.register(
  'AuthUsuario',
  z.object({
    id: objectIdField,
    nome: z.string().openapi({ example: 'João Silva' }),
    email: z.string().email().openapi({ example: 'joao@email.com' }),
    emailVerified: z.boolean().openapi({ example: true }),
    ativo: z.boolean().openapi({ example: true }),
    fotoPerfil: z.string().nullable().optional().openapi({ example: null }),
    ...timestampFields,
  }),
);

const AuthLoginBody = registry.register(
  'AuthLoginBody',
  z.object({
    email: z.string().email().openapi({ example: 'joao@email.com' }),
    password: z.string().min(8).openapi({ example: 'senha-forte-123' }),
    rememberMe: z.boolean().optional().openapi({ example: true }),
  }),
);

const AuthLoginResposta = registry.register(
  'AuthLoginResposta',
  z.object({
    redirect: z.boolean().openapi({ example: false }),
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
    user: AuthUsuario,
  }),
);

const AuthSessionResposta = registry.register(
  'AuthSessionResposta',
  z.object({
    session: z.object({
      id: objectIdField,
      userId: objectIdField,
      expiresAt: z
        .string()
        .datetime()
        .openapi({ example: '2024-01-22T10:30:00.000Z' }),
      token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
    }),
    user: AuthUsuario,
  }),
);

const AuthForgetPasswordBody = registry.register(
  'AuthForgetPasswordBody',
  z.object({
    email: z.string().email().openapi({ example: 'joao@email.com' }),
    redirectTo: z
      .string()
      .optional()
      .openapi({ example: 'https://app.exemplo.com/redefinir-senha' }),
  }),
);

const AuthResetPasswordBody = registry.register(
  'AuthResetPasswordBody',
  z.object({
    newPassword: z.string().min(8).openapi({ example: 'nova-senha-forte-123' }),
    token: z.string().openapi({ example: 'token-recebido-por-email' }),
  }),
);

const AuthChangePasswordBody = registry.register(
  'AuthChangePasswordBody',
  z.object({
    currentPassword: z.string().openapi({ example: 'senha-forte-123' }),
    newPassword: z.string().min(8).openapi({ example: 'nova-senha-forte-123' }),
    revokeOtherSessions: z.boolean().optional().openapi({ example: false }),
  }),
);

const AuthOkResposta = registry.register(
  'AuthOkResposta',
  z.object({ status: z.boolean().openapi({ example: true }) }),
);

registerPaths({
  '/api/auth/sign-in/email': {
    post: {
      tags: ['Auth'],
      summary: 'Login com e-mail e senha',
      description: `
            + Caso de uso: Autenticação de um usuário já ativo via e-mail e senha (Better Auth).

            + Regras de Negócio:
                - Usuário precisa existir, estar ativo e ter senha cadastrada.
                - Sessão é criada no Mongo e devolvida via cookie; o plugin bearer também devolve o token no header \`set-auth-token\` e no corpo, para uso fora de browser (ex.: Authorize desta documentação).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthLoginResposta**. Use o campo \`token\` (ou o header \`set-auth-token\`) no botão Authorize como Bearer token.
            `,
      security: [],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthLoginBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Login efetuado com sucesso',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginResposta' },
            },
          },
        },
        401: { description: 'Credenciais inválidas' },
        403: { description: 'Usuário inativo' },
      },
    },
  },

  '/api/auth/get-session': {
    get: {
      tags: ['Auth'],
      summary: 'Obtém a sessão autenticada atual',
      description: `
            + Caso de uso: Consultar se a sessão (cookie ou Bearer token) atual é válida e a quem pertence.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthSessionResposta**, ou corpo vazio (\`null\`) se não houver sessão válida.
            `,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Sessão válida (ou null se não autenticado)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthSessionResposta' },
            },
          },
        },
      },
    },
  },

  '/api/auth/sign-out': {
    post: {
      tags: ['Auth'],
      summary: 'Encerra a sessão atual',
      description: `
            + Caso de uso: Logout do usuário autenticado, invalidando a sessão atual no Mongo.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthOkResposta**.
            `,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Sessão encerrada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthOkResposta' },
            },
          },
        },
        401: { description: 'Sem sessão válida' },
      },
    },
  },

  '/api/auth/forget-password': {
    post: {
      tags: ['Auth'],
      summary: 'Solicita e-mail de redefinição de senha',
      description: `
            + Caso de uso: Usuário esqueceu a senha e pede um link de redefinição por e-mail.

            + Regras de Negócio:
                - Sempre responde 200, exista ou não o e-mail (evita enumeração de contas).
                - Token de redefinição expira em 24h.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthOkResposta**.
            `,
      security: [],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthForgetPasswordBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Solicitação aceita',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthOkResposta' },
            },
          },
        },
      },
    },
  },

  '/api/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Redefine a senha com o token recebido por e-mail',
      description: `
            + Caso de uso: Conclusão do fluxo de redefinição de senha, ou ativação de conta convidada (mesmo token de convite).

            + Regras de Negócio:
                - Token inválido ou expirado é rejeitado.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthOkResposta**.
            `,
      security: [],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthResetPasswordBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Senha redefinida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthOkResposta' },
            },
          },
        },
        400: { description: 'Token inválido ou expirado' },
      },
    },
  },

  '/api/auth/change-password': {
    post: {
      tags: ['Auth'],
      summary: 'Troca a senha do usuário autenticado',
      description: `
            + Caso de uso: Usuário já autenticado troca a própria senha, informando a senha atual.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **AuthOkResposta**.
            `,
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthChangePasswordBody' },
          },
        },
      },
      responses: {
        200: {
          description: 'Senha alterada',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthOkResposta' },
            },
          },
        },
        401: { description: 'Senha atual incorreta ou sessão inválida' },
      },
    },
  },
});
