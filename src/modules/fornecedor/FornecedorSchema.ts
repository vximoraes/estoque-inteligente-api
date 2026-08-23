import { z } from 'zod';

const FornecedorSchema = z.object({
  nome: z.string().min(1, 'Campo nome é obrigatório.'),
  ativo: z.boolean().default(true),
  url: z
    .string()
    .url('URL deve ser válida.')
    .optional()
    .or(z.literal('')),
  contato: z.string().optional(),
  descricao: z.string().optional(),
});

const FornecedorUpdateSchema = FornecedorSchema.partial();

export type Fornecedor = z.infer<typeof FornecedorSchema>;
export type FornecedorUpdate = z.infer<typeof FornecedorUpdateSchema>;

export { FornecedorSchema, FornecedorUpdateSchema };
