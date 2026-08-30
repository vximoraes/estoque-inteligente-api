import { senhaRegex } from './UsuarioSchema.js';

const ROTAS_COM_SENHA_NOVA = new Set(['/reset-password', '/change-password']);

const MENSAGEM_SENHA_FRACA =
  'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.';

/**
 * Better Auth só valida minPasswordLength nativamente; usado no hooks.before de config/auth.ts
 * pra reforçar a mesma complexidade do UsuarioSchema em /reset-password e /change-password
 * (rotas que o front chama direto via authClient, sem passar pelo Zod da API).
 */
function mensagemSenhaInvalida(path: string, body: unknown): string | null {
  if (!ROTAS_COM_SENHA_NOVA.has(path)) return null;

  const novaSenha = (body as Record<string, unknown> | undefined)?.[
    'newPassword'
  ] as string | undefined;

  if (novaSenha && !senhaRegex.test(novaSenha)) {
    return MENSAGEM_SENHA_FRACA;
  }

  return null;
}

export default mensagemSenhaInvalida;
