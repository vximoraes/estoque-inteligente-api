import { z } from 'zod';
import { objectIdSchema } from '../../utils/commonFields.js';

const MovimentacaoSchema = z.object({
  tipo: z
    .string()
    .optional()
    .refine((val) => !val || val === 'entrada' || val === 'saida', {
      message: "Tipo deve ser 'entrada' ou 'saida'",
    }),
  data_hora: z
    .string()
    .refine((val) => val === undefined, {
      message:
        'O campo data/hora não pode ser informado. Ele é preenchido automaticamente com a data/hora atual.',
    })
    .optional(),
  quantidade: z
    .string({ required_error: 'Campo quantidade é obrigatório.' })
    .regex(/^\d+$/, 'Quantidade deve ser um número inteiro')
    .transform((val) => Number(val))
    .refine((val) => val >= 1 && val <= 999999999, {
      message: 'Quantidade: 1 a 999.999.999',
    }),
  item: objectIdSchema,
  localizacao: objectIdSchema,
});

const MovimentacaoUpdateSchema = MovimentacaoSchema.partial();

export type Movimentacao = z.infer<typeof MovimentacaoSchema>;
export type MovimentacaoUpdate = z.infer<typeof MovimentacaoUpdateSchema>;

export { MovimentacaoSchema, MovimentacaoUpdateSchema };
