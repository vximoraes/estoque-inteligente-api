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

// Lista ordenada de pares chave/valor, sempre texto — a ordem em si não tem
// significado de negócio, mas é preservada por refletir a ordem em que o
// usuário digitou os campos no formulário. Chaves duplicadas (mesma unidade)
// são rejeitadas para não sobrescrever silenciosamente um campo pelo outro.
const camposPersonalizadosSchema = z
  .array(
    z.object({
      chave: z
        .string()
        .trim()
        .min(1, 'Nome do campo não pode ser vazio')
        .max(50, 'Nome do campo deve ter no máximo 50 caracteres'),
      valor: z
        .string()
        .trim()
        .min(1, 'Valor do campo não pode ser vazio')
        .max(200, 'Valor do campo deve ter no máximo 200 caracteres'),
    }),
  )
  .max(20, 'Máximo de 20 campos personalizados por patrimônio')
  .superRefine((campos, ctx) => {
    const vistas = new Set<string>();
    campos.forEach((campo, index) => {
      const chaveNormalizada = campo.chave.toLocaleLowerCase('pt-BR');
      if (vistas.has(chaveNormalizada)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Campo personalizado duplicado: '${campo.chave}'`,
          path: [index, 'chave'],
        });
      }
      vistas.add(chaveNormalizada);
    });
  });

const modeloSchema = z
  .string()
  .trim()
  .max(100, 'Modelo deve ter no máximo 100 caracteres')
  .optional();

const fabricanteSchema = z
  .string()
  .trim()
  .max(100, 'Fabricante deve ter no máximo 100 caracteres')
  .optional();

// Status inicial aceita os mesmos 3 destinos livres de `PatrimonioStatusSchema`
// ('Emprestado' de propósito fora — só entra pelo fluxo de empréstimo).
// Omitido, o Service assume 'Disponível'.
const statusInicialSchema = z
  .enum(['Disponível', 'Manutenção', 'Baixado'])
  .optional();

const PatrimonioSchema = z.object({
  numero_patrimonio: z
    .string()
    .trim()
    .min(1, 'Número de patrimônio não pode ser vazio')
    .max(60, 'Número de patrimônio deve ter no máximo 60 caracteres'),
  modelo: modeloSchema,
  fabricante: fabricanteSchema,
  categoria: objectIdSchema,
  localizacao: objectIdSchema,
  status: statusInicialSchema,
  data_aquisicao: dataAquisicaoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
  campos_personalizados: camposPersonalizadosSchema.optional(),
});

// Cadastro em lote: gera N unidades do mesmo modelo com numeração
// sequencial `${prefixo}-${numero_inicial..numero_inicial+quantidade-1}`,
// preenchido com zeros à esquerda até 4 dígitos.
const PatrimonioLoteSchema = z.object({
  modelo: modeloSchema,
  fabricante: fabricanteSchema,
  categoria: objectIdSchema,
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
  campos_personalizados: camposPersonalizadosSchema.optional(),
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
  modelo: modeloSchema,
  fabricante: fabricanteSchema,
  categoria: objectIdSchema.optional(),
  data_aquisicao: dataAquisicaoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
  campos_personalizados: camposPersonalizadosSchema.optional(),
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
