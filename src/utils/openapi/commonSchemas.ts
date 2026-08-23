import { z } from 'zod';

export const objectIdField = z.string().openapi({
  example: '507f1f77bcf86cd799439011',
  description: 'MongoDB ObjectId',
});

export const timestampFields = {
  createdAt: z
    .string()
    .datetime()
    .openapi({ example: '2024-01-15T10:30:00.000Z' }),
  updatedAt: z
    .string()
    .datetime()
    .openapi({ example: '2024-01-15T10:30:00.000Z' }),
};

export const paginationMetaFields = {
  totalDocs: z.number().openapi({ example: 100 }),
  limit: z.number().openapi({ example: 10 }),
  totalPages: z.number().openapi({ example: 10 }),
  page: z.number().openapi({ example: 1 }),
  pagingCounter: z.number().openapi({ example: 1 }),
  hasPrevPage: z.boolean().openapi({ example: false }),
  hasNextPage: z.boolean().openapi({ example: true }),
  prevPage: z.number().nullable().openapi({ example: null }),
  nextPage: z.number().openapi({ example: 2 }),
};

export const idPathParam = (description: string) => ({
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description,
});

export const paginationQueryParams = [
  {
    name: 'page',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Número da página',
  },
  {
    name: 'limite',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    description: 'Quantidade de itens por página (máximo 100)',
  },
];
