import {
  createOrdenarSchema,
  objectIdSchema,
} from '../../utils/commonFields.js';
import { z } from 'zod';

export const ESTOQUE_SORT_FIELDS = {
  quantidade: 'quantidade',
  createdAt: 'createdAt',
} as const;

const EstoqueQuerySchema = z.object({
  item: objectIdSchema.optional(),
  localizacao: objectIdSchema.optional(),
  quantidade: z.string().optional(),
  categoria: z.string().optional(),
  nome: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  status: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        ['Indisponível', 'Baixo Estoque', 'Em Estoque'].includes(value),
      {
        message:
          "Status deve ser 'Indisponível', 'Baixo Estoque' ou 'Em Estoque'",
      },
    ),
  ordenar: createOrdenarSchema(Object.keys(ESTOQUE_SORT_FIELDS)),
  page: z.string().optional(),
  limite: z.string().optional(),
});

const EstoqueIdSchema = objectIdSchema;

export type EstoqueQuery = z.output<typeof EstoqueQuerySchema>;

export { EstoqueQuerySchema, EstoqueIdSchema };
