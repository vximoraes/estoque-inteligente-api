import { z } from 'zod';

const CategoriaSchema = z.object({
  nome: z.string().min(1, 'Campo nome é obrigatório.'),
  ativo: z.boolean().default(true),
  descricao: z
    .string()
    .max(200, 'A descrição deve ter no máximo 200 caracteres.')
    .optional(),
});

const CategoriaUpdateSchema = CategoriaSchema.partial();

export type Categoria = z.infer<typeof CategoriaSchema>;
export type CategoriaUpdate = z.infer<typeof CategoriaUpdateSchema>;

export { CategoriaSchema, CategoriaUpdateSchema };
