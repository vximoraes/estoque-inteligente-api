import { z } from 'zod';
import mongoose from 'mongoose';
import { createOrdenarSchema } from '../../utils/commonFields.js';

export const MovimentacaoIdSchema = z
  .string()
  .refine((id) => mongoose.Types.ObjectId.isValid(id), {
    message: 'ID inválido',
  });

export const MOVIMENTACAO_SORT_FIELDS = {
  data_hora: 'data_hora',
  quantidade: 'quantidade',
  createdAt: 'createdAt',
} as const;

const dataInicioSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'data_inicio deve estar no formato YYYY-MM-DD',
  })
  .transform((val) => (val ? new Date(`${val}T00:00:00.000Z`) : undefined));

const dataFimSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'data_fim deve estar no formato YYYY-MM-DD',
  })
  .transform((val) => (val ? new Date(`${val}T23:59:59.999Z`) : undefined));

export const MovimentacaoQuerySchema = z.object({
  tipo: z
    .string()
    .optional()
    .refine((val) => !val || val === 'entrada' || val === 'saida', {
      message: "Tipo deve ser 'entrada' ou 'saida'",
    }),
  data: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Data deve estar no formato YYYY-MM-DD',
    })
    .transform((val) => (val ? new Date(val + 'T00:00:00Z') : undefined))
    .refine(
      (val) =>
        val === undefined || (val instanceof Date && !isNaN(val.getTime())),
      {
        message: 'Data deve ser uma data válida',
      },
    ),
  data_inicio: dataInicioSchema,
  data_fim: dataFimSchema,
  quantidade: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined))
    .refine((val) => val === undefined || Number.isInteger(val), {
      message: 'Quantidade deve ser um número inteiro',
    }),
  item: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  localizacao: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  fornecedor: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  page: z.string().optional(),
  limite: z.string().optional(),
  ordenar: createOrdenarSchema(Object.keys(MOVIMENTACAO_SORT_FIELDS)),
});

export const MovimentacaoResumoQuerySchema = z.object({
  tipo: z
    .string()
    .optional()
    .refine((val) => !val || val === 'entrada' || val === 'saida', {
      message: "Tipo deve ser 'entrada' ou 'saida'",
    }),
  data_inicio: dataInicioSchema,
  data_fim: dataFimSchema,
  item: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
  localizacao: z
    .string()
    .optional()
    .transform((val) => val?.trim()),
});

export const MOVIMENTACAO_TENDENCIA_MESES = [6, 12, 24] as const;

// `data_inicio`/`data_fim` (período personalizado) têm prioridade sobre
// `meses` (atalho) quando ambos vêm na query — ver MovimentacaoRepository.tendencia.
export const MovimentacaoTendenciaQuerySchema = z.object({
  meses: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine(
      (val) =>
        val === undefined ||
        (MOVIMENTACAO_TENDENCIA_MESES as readonly number[]).includes(val),
      { message: 'meses deve ser 6, 12 ou 24' },
    ),
  data_inicio: dataInicioSchema,
  data_fim: dataFimSchema,
});
