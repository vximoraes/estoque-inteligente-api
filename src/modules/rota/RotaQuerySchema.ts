import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../utils/commonFields.js';

export const RotaIdSchema = objectIdSchema;

export const RotaQuerySchema = paginationSchema.extend({
  rota: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Rota não pode ser vazia',
    })
    .transform((val) => val?.trim()),
});

export type RotaQuery = z.output<typeof RotaQuerySchema>;
