import { objectIdSchema } from '../../utils/commonFields.js';
import { z } from 'zod';

const EstoqueQuerySchema = z.object({
  item: objectIdSchema.optional(),
  localizacao: objectIdSchema.optional(),
  quantidade: z.string().optional(),
  page: z.string().optional(),
  limite: z.string().optional(),
});

const EstoqueIdSchema = objectIdSchema;

export type EstoqueQuery = z.output<typeof EstoqueQuerySchema>;

export { EstoqueQuerySchema, EstoqueIdSchema };
