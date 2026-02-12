import { z } from 'zod';

const FornecedorSchema = z.object({
    nome: z
        .string()
        .min(1, 'Campo nome é obrigatório.'),
    ativo: z
        .boolean()
        .default(true),
    url: z
        .string()
        .url('URL deve ser válida.')
        .optional(),
    contato: z
        .string()
        .optional(),
    descricao: z
        .string()
        .optional(),
});

const FornecedorUpdateSchema = FornecedorSchema
    .partial();

export { FornecedorSchema, FornecedorUpdateSchema };