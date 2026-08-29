import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido',
  });

export const paginationSchema = z.object({
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
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
      message: 'Limite deve ser um número inteiro entre 1 e 100',
    }),
});

export type ObjectIdInput = z.input<typeof objectIdSchema>;
export type PaginationQuery = z.output<typeof paginationSchema>;

// Formato aceito: "<campo>:asc" ou "<campo>:desc", com `campo` restrito à
// whitelist do módulo — nunca ordenar por um campo arbitrário vindo da query.
export function createOrdenarSchema(camposPermitidos: readonly string[]) {
  return z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const [campo, direcao] = val.split(':');
        return (
          !!campo &&
          camposPermitidos.includes(campo) &&
          (direcao === 'asc' || direcao === 'desc')
        );
      },
      { message: 'Ordenação inválida' },
    );
}
