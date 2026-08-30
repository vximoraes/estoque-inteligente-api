import { z } from 'zod';
import {
  objectIdSchema,
  paginationSchema,
  createOrdenarSchema,
} from '../../utils/commonFields.js';

export const OrcamentoIdSchema = objectIdSchema;

export const ORCAMENTO_SORT_FIELDS = {
  nome: 'nome',
  total: 'total',
  createdAt: 'createdAt',
} as const;

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
  ordenar: createOrdenarSchema(Object.keys(ORCAMENTO_SORT_FIELDS)),
});

export type OrcamentoQuery = z.output<typeof OrcamentoQuerySchema>;
