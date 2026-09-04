import { z } from 'zod';
import mongoose from 'mongoose';
import { createOrdenarSchema } from '../../utils/commonFields.js';

export const EmprestimoIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID invalido',
  });

export const EMPRESTIMO_SORT_FIELDS = {
  solicitante_nome: 'solicitante_nome',
  data_saida: 'data_saida',
  data_prevista_devolucao: 'data_prevista_devolucao',
  createdAt: 'createdAt',
} as const;

export const EmprestimoQuerySchema = z.object({
  busca: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  item: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  tipo_controle: z.enum(['quantidade', 'unidade']).optional(),
  localizacao: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  solicitante_nome: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  apenas_abertos: z
    .string()
    .optional()
    .refine((val) => !val || val === 'true' || val === 'false', {
      message: "apenas_abertos deve ser 'true' ou 'false'",
    }),
  atrasados: z
    .string()
    .optional()
    .refine((val) => !val || val === 'true' || val === 'false', {
      message: "atrasados deve ser 'true' ou 'false'",
    }),
  data_saida_inicio: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'data_saida_inicio deve estar no formato YYYY-MM-DD',
    })
    .transform((val) => (val ? new Date(`${val}T00:00:00.000Z`) : undefined)),
  data_saida_fim: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'data_saida_fim deve estar no formato YYYY-MM-DD',
    })
    .transform((val) => (val ? new Date(`${val}T23:59:59.999Z`) : undefined)),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'page deve ser inteiro maior que 0',
    }),
  limite: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => Number.isInteger(val) && val > 0 && val <= 100, {
      message: 'limite deve ser inteiro entre 1 e 100',
    }),
  ordenar: createOrdenarSchema(Object.keys(EMPRESTIMO_SORT_FIELDS)),
});

export const EMPRESTIMO_TENDENCIA_MESES = [6, 12, 24] as const;

// `data_inicio`/`data_fim` (período personalizado) têm prioridade sobre
// `meses` (atalho) quando ambos vêm na query — ver EmprestimoRepository.tendencia.
export const EmprestimoTendenciaQuerySchema = z.object({
  meses: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine(
      (val) =>
        val === undefined ||
        (EMPRESTIMO_TENDENCIA_MESES as readonly number[]).includes(val),
      { message: 'meses deve ser 6, 12 ou 24' },
    ),
  data_inicio: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'data_inicio deve estar no formato YYYY-MM-DD',
    }),
  data_fim: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'data_fim deve estar no formato YYYY-MM-DD',
    }),
});
