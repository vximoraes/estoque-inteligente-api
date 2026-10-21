import { z } from 'zod';
import { fusoValido } from '../../utils/fusoHorario.js';

const senhaRegex = /^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\d)(?=.*[^\p{L}\d]).+$/u;
const nomeRegex =
  /^([A-ZÀ-Ö][a-zà-öø-ÿ]{1,})( ((de|da|do|das|dos)|[A-ZÀ-Ö][a-zà-öø-ÿ]{1,}))*$/;

const UsuarioSchema = z.object({
  nome: z
    .string()
    .min(1, 'Campo nome é obrigatório.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.')
    .regex(
      nomeRegex,
      'O nome não pode ter caracteres especiais, nem números e somente ter letras maiúsculas no começo de cada nome/sobrenome, possuindo ao menos 2 letras',
    ),
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
      },
    ),
  ativo: z.boolean().default(true),
  fuso_horario: z
    .string()
    .refine(fusoValido, {
      message:
        'Fuso horário inválido. Use um identificador IANA (ex: America/Sao_Paulo).',
    })
    .nullable()
    .optional(),
});

const UsuarioUpdateSchema = UsuarioSchema.omit({ email: true }).partial();
const ConviteSchema = UsuarioSchema.pick({ nome: true, email: true });

export type Usuario = z.infer<typeof UsuarioSchema>;
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;

export { UsuarioSchema, UsuarioUpdateSchema, ConviteSchema, senhaRegex };
