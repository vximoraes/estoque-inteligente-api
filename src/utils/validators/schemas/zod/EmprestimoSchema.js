import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';

const quantidadeSchema = z
  .union([z.string(), z.number()])
  .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
  .refine((val) => Number.isInteger(val), {
    message: 'Quantidade deve ser inteira',
  })
  .refine((val) => val >= 1 && val <= 999999999, {
    message: 'Quantidade: 1 a 999.999.999',
  });

const dataFuturaSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return null;
    }

    const data = new Date(val);
    return Number.isNaN(data.getTime()) ? 'INVALID_DATE' : data;
  })
  .refine((val) => val === null || val !== 'INVALID_DATE', {
    message: 'Data prevista de devolucao invalida',
  })
  .refine((val) => val === null || val > new Date(), {
    message: 'Data prevista de devolucao deve ser futura',
  });

const EmprestimoSchema = z.object({
  item: objectIdSchema,
  localizacao: objectIdSchema,
  quantidade_emprestada: quantidadeSchema,
  solicitante_nome: z
    .string()
    .trim()
    .min(3, 'Solicitante deve ter no minimo 3 caracteres')
    .max(120, 'Solicitante deve ter no maximo 120 caracteres'),
  data_prevista_devolucao: dataFuturaSchema,
  observacoes_emprestimo: z
    .string()
    .trim()
    .max(500, 'Observacoes devem ter no maximo 500 caracteres')
    .optional(),
});

const DevolucaoEmprestimoSchema = z.object({
  quantidade_devolvida: quantidadeSchema,
  observacoes_devolucao: z
    .string()
    .trim()
    .max(500, 'Observacoes devem ter no maximo 500 caracteres')
    .optional(),
});

const AtualizarEmprestimoSchema = z.object({
  solicitante_nome: z
    .string()
    .trim()
    .min(3, 'Solicitante deve ter no minimo 3 caracteres')
    .max(120, 'Solicitante deve ter no maximo 120 caracteres')
    .optional(),
  data_prevista_devolucao: dataFuturaSchema.optional(),
  observacoes_emprestimo: z
    .string()
    .trim()
    .max(500, 'Observacoes devem ter no maximo 500 caracteres')
    .optional(),
});

export { EmprestimoSchema, DevolucaoEmprestimoSchema, AtualizarEmprestimoSchema };
