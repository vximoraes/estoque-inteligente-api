import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../utils/commonFields.js';

export const OrcamentoIdSchema = objectIdSchema;

const valorSchema = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Number(val)), {
    message: 'Valor deve ser um número',
  })
  .transform((val) => (val ? Number(val) : undefined));

const dataSchema = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Data inválida',
  });

export const OrcamentoQuerySchema = paginationSchema.extend({
  nome: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Nome não pode ser vazio',
    })
    .transform((val) => val?.trim()),
  valorMin: valorSchema,
  valorMax: valorSchema,
  dataInicio: dataSchema,
  dataFim: dataSchema,
});

export type OrcamentoQuery = z.output<typeof OrcamentoQuerySchema>;
