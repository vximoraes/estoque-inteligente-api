import { z } from 'zod';
import { objectIdSchema } from '../../utils/commonFields.js';

export const NotificacaoIdSchema = objectIdSchema;

export const NotificacaoQuerySchema = z.object({
  usuario: z
    .string()
    .optional()
    .refine((val) => !val || objectIdSchema.safeParse(val).success, {
      message: 'ID de usuário inválido',
    }),
  visualizada: z
    .string()
    .optional()
    .refine((value) => !value || value === 'true' || value === 'false', {
      message: "Lida deve ser 'true' ou 'false'",
    }),
  dataInicial: z.date().optional(),
  dataFinal: z.date().optional(),
});

export type NotificacaoQuery = z.output<typeof NotificacaoQuerySchema>;
