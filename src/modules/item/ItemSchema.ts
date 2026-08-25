import { z } from 'zod';
import { objectIdSchema } from '../../utils/commonFields.js';

const ItemSchema = z.object({
  nome: z
    .string()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Nome não pode ser vazio',
    })
    .transform((val) => val?.trim()),
  tipo: z.enum(['consumo']).default('consumo'),
  estoque_minimo: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined))
    .refine((val) => val === undefined || Number.isInteger(val), {
      message: 'Estoque mínimo deve ser inteiro',
    })
    .refine((val) => val === undefined || (val >= 0 && val <= 999999999), {
      message: 'Estoque mínimo: 0 a 999.999.999',
    }),
  descricao: z.string().optional(),
  imagem: z.string().optional(),
  categoria: objectIdSchema,
  ativo: z.boolean().default(true),
});

const ItemUpdateSchema = ItemSchema.omit({ tipo: true }).partial();

export type Item = z.infer<typeof ItemSchema>;
export type ItemUpdate = z.infer<typeof ItemUpdateSchema>;

export { ItemSchema, ItemUpdateSchema };
