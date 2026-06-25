import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../utils/commonFields.js';

export const FornecedorIdSchema = objectIdSchema;

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
});

export type FornecedorQuery = z.output<typeof FornecedorQuerySchema>;
