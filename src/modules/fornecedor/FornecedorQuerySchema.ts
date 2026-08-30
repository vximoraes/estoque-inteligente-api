import { z } from 'zod';
import {
  objectIdSchema,
  paginationSchema,
  createOrdenarSchema,
} from '../../utils/commonFields.js';

export const FornecedorIdSchema = objectIdSchema;

export const FORNECEDOR_SORT_FIELDS = {
  nome: 'nome',
  createdAt: 'createdAt',
} as const;

export const FornecedorQuerySchema = paginationSchema.extend({
  nome: z
    .string()
    .optional()
    .transform((val) => {
      return val === undefined ? undefined : val.trim() || null;
    })
    .refine((val) => val === undefined || val !== null, {
      message: 'Nome não pode ser vazio',
    }),
  ordenar: createOrdenarSchema(Object.keys(FORNECEDOR_SORT_FIELDS)),
});

export type FornecedorQuery = z.output<typeof FornecedorQuerySchema>;
