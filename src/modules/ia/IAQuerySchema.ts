import { z } from 'zod';
import mongoose from 'mongoose';

export const ConversaIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido',
  });

export const ListarConversasQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Page deve ser um número inteiro maior que 0',
    }),
  limite: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 50, {
      message: 'Limite deve ser um número inteiro entre 1 e 50',
    }),
});
