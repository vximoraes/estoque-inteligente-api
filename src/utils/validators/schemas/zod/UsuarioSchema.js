import { z } from 'zod';

const senhaRegex = /^(?=.*[?@!#$%^&*()/\\])(?=.*[0-9])(?=.*[a-zA-Z])[?@!#$%^&*()/\\a-zA-Z0-9]+$/
const nomeRegex = /^([A-ZÀ-Ö][a-zà-öø-ÿ]{1,})( ((de|da|do|das|dos)|[A-ZÀ-Ö][a-zà-öø-ÿ]{1,}))*$/

const UsuarioSchema = z.object({
  nome: z
    .string()
    .min(1, 'Campo nome é obrigatório.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  email: z
    .string()
    .email('Formato de email inválido.')
    .min(1, 'Campo email é obrigatório.'),
  senha: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .refine(
      (senha) => {
        return senhaRegex.test(senha);
      },
      {
        message:
          'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
      }
    ),
  ativo: z
    .boolean()
    .default(true),
});

const UsuarioUpdateSchema = UsuarioSchema
  .omit({ email: true })
  .partial();

export { UsuarioSchema, UsuarioUpdateSchema };