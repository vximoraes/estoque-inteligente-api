import { z } from 'zod';
import { objectIdSchema } from '../../utils/commonFields.js';

const dataAquisicaoSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return undefined;
    }
    const data = new Date(val);
    return Number.isNaN(data.getTime()) ? 'INVALID_DATE' : data;
  })
  .refine((val) => val !== 'INVALID_DATE', {
    message: 'Data de aquisição inválida',
  });

const PatrimonioSchema = z.object({
  item: objectIdSchema,
  numero_patrimonio: z
    .string()
    .trim()
    .min(1, 'Número de patrimônio não pode ser vazio')
    .max(60, 'Número de patrimônio deve ter no máximo 60 caracteres'),
  localizacao: objectIdSchema,
  data_aquisicao: dataAquisicaoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

// Cadastro em lote: gera N unidades do mesmo modelo com numeração
// sequencial `${prefixo}-${numero_inicial..numero_inicial+quantidade-1}`,
// preenchido com zeros à esquerda até 4 dígitos.
const PatrimonioLoteSchema = z.object({
  item: objectIdSchema,
  localizacao: objectIdSchema,
  quantidade: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => Number.isInteger(val) && val >= 1 && val <= 500, {
      message: 'Quantidade: 1 a 500 unidades por lote',
    }),
  prefixo: z
    .string()
    .trim()
    .min(1, 'Prefixo não pode ser vazio')
    .max(20, 'Prefixo deve ter no máximo 20 caracteres'),
  numero_inicial: z
    .union([z.string(), z.number()])
    .default(1)
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => Number.isInteger(val) && val >= 1, {
      message: 'Número inicial deve ser um inteiro maior ou igual a 1',
    }),
  data_aquisicao: dataAquisicaoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

// Atualização direta: só metadados de cadastro. `status` e `localizacao`
// mudam exclusivamente pelos endpoints de transição/transferência, para
// garantir que toda mudança de estado gere um PatrimonioEvento.
const PatrimonioUpdateSchema = z.object({
  numero_patrimonio: z
    .string()
    .trim()
    .min(1, 'Número de patrimônio não pode ser vazio')
    .max(60, 'Número de patrimônio deve ter no máximo 60 caracteres')
    .optional(),
  data_aquisicao: dataAquisicaoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

// 'Emprestado' não é um destino válido aqui de propósito: a transição
// Disponível→Emprestado só acontece via fluxo de empréstimo (Fase 3), que
// usa update condicional atômico para evitar duas pessoas emprestando a
// mesma unidade. O Service reforça essa regra de novo, defensivamente.
const PatrimonioStatusSchema = z.object({
  status: z.enum(['Disponível', 'Manutenção', 'Baixado']),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

const PatrimonioLocalizacaoSchema = z.object({
  localizacao: objectIdSchema,
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

export type Patrimonio = z.infer<typeof PatrimonioSchema>;
export type PatrimonioLote = z.infer<typeof PatrimonioLoteSchema>;
export type PatrimonioUpdate = z.infer<typeof PatrimonioUpdateSchema>;
export type PatrimonioStatus = z.infer<typeof PatrimonioStatusSchema>;
export type PatrimonioLocalizacaoInput = z.infer<
  typeof PatrimonioLocalizacaoSchema
>;

export {
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
};
