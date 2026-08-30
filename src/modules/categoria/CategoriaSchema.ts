import { z } from 'zod';

const CategoriaSchema = z.object({
  nome: z.string().min(1, 'Campo nome é obrigatório.'),
  tipo: z.enum(['consumo', 'permanente'], {
    errorMap: () => ({ message: "Tipo deve ser 'consumo' ou 'permanente'" }),
  }),
  ativo: z.boolean().default(true),
  descricao: z
    .string()
    .max(200, 'A descrição deve ter no máximo 200 caracteres.')
    .optional(),
});

// `tipo` é imutável (mesma regra de Item.tipo): não pode ser alterado
// depois de criada, senão itens já vinculados ficariam num domínio errado.
const CategoriaUpdateSchema = CategoriaSchema.omit({ tipo: true }).partial();

export type Categoria = z.infer<typeof CategoriaSchema>;
export type CategoriaUpdate = z.infer<typeof CategoriaUpdateSchema>;

export { CategoriaSchema, CategoriaUpdateSchema };
