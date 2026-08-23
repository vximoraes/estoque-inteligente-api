import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

const allPaths: Record<string, unknown> = {};

export const registerPaths = (paths: Record<string, unknown>): void => {
  Object.assign(allPaths, paths);
};

export const generateSpec = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const doc = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API Estoque Inteligente',
      version: '1.0.0',
      description:
        'API para gestão de estoque inteligente.\n\nAutentique em POST /api/auth/sign-in/email e use o token retornado (campo `token` ou header `set-auth-token`) no botão Authorize antes de usar as rotas protegidas.',
      contact: {
        name: 'Equipe de Desenvolvimento',
        email: 'dev@estoque-inteligente.com',
      },
    },
    servers: [
      {
        url:
          process.env.SWAGGER_DEV_URL || `http://localhost:${process.env.PORT}`,
      },
    ],
  });

  return {
    ...doc,
    tags: [
      { name: 'Auth', description: 'Rotas para autenticação e autorização' },
      { name: 'Usuários', description: 'Rotas para gestão de usuários' },
      { name: 'Itens', description: 'Rotas para gestão de itens do estoque' },
      { name: 'Categorias', description: 'Rotas para gestão de categorias' },
      {
        name: 'Fornecedores',
        description: 'Rotas para gestão de fornecedores',
      },
      { name: 'Localização', description: 'Rotas para gestão de localização' },
      { name: 'Estoque', description: 'Rotas para gestão de estoque' },
      {
        name: 'Movimentação',
        description: 'Rotas para gestão de movimentações',
      },
      { name: 'Orçamentos', description: 'Rotas para gestão de orçamentos' },
      {
        name: 'Notificações',
        description: 'Rotas para gestão de notificações',
      },
      {
        name: 'Emprestimos',
        description: 'Rotas para gestão de emprestimos de itens',
      },
      {
        name: 'Grupos',
        description: 'Rotas para gestão de grupos e permissões',
      },
      {
        name: 'Rotas',
        description: 'Rotas para gestão de rotas de acesso do sistema',
      },
      {
        name: 'IA',
        description: 'Rotas do assistente de IA (chat sobre o estoque)',
      },
    ],
    paths: allPaths,
    components: {
      ...doc.components,
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  };
};
