import { z } from 'zod';

const LocalizacaoSchema = z.object({
  nome: z.string().min(1, 'Campo nome é obrigatório.'),
  ativo: z.boolean().default(true),
});

const LocalizacaoUpdateSchema = LocalizacaoSchema.partial();

export type Localizacao = z.infer<typeof LocalizacaoSchema>;
export type LocalizacaoUpdate = z.infer<typeof LocalizacaoUpdateSchema>;

export { LocalizacaoSchema, LocalizacaoUpdateSchema };
