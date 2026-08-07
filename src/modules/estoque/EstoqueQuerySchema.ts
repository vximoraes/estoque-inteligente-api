import { objectIdSchema } from '../../utils/commonFields.js';
import { z } from 'zod';

const EstoqueQuerySchema = z.object({
  item: objectIdSchema.optional(),
  localizacao: objectIdSchema.optional(),
  quantidade: z.string().optional(),
  categoria: z.string().optional(),
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
  page: z.string().optional(),
  limite: z.string().optional(),
});

const EstoqueIdSchema = objectIdSchema;

export type EstoqueQuery = z.output<typeof EstoqueQuerySchema>;

export { EstoqueQuerySchema, EstoqueIdSchema };
