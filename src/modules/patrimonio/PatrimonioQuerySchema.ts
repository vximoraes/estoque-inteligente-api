import { z } from 'zod';
import mongoose from 'mongoose';

export const PatrimonioIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido',
  });

export const PatrimonioQuerySchema = z.object({
  modelo: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  status: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        ['Disponível', 'Emprestado', 'Manutenção', 'Baixado'].includes(value),
      {
        message:
          "Status deve ser 'Disponível', 'Emprestado', 'Manutenção' ou 'Baixado'",
      },
    ),
  localizacao: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Localização inválida',
    }),
  numero_patrimonio: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  busca: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  categoria: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  ativo: z
    .string()
    .optional()
    .refine((value) => !value || value === 'true' || value === 'false', {
      message: "Ativo deve ser 'true' ou 'false'",
    }),
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
