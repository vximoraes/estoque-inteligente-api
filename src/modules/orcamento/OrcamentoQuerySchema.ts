import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../utils/commonFields.js';

export const OrcamentoIdSchema = objectIdSchema;

export const OrcamentoQuerySchema = paginationSchema.extend({
  nome: z.string().optional().refine((val) => !val || val.trim().length > 0, {
    message: 'Nome não pode ser vazio',
  }).transform((val) => val?.trim()),
});

export type OrcamentoQuery = z.output<typeof OrcamentoQuerySchema>;
