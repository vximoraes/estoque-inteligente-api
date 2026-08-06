import { z } from 'zod';

const REGEX_CONTROLES_ASCII = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]',
  'g',
);
const REGEX_INVISIVEIS_UNICODE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFE00-\\uFE0F\\uFEFF]',
  'g',
);

export function limparCaracteresInvisiveis(valor: string): string {
  return valor
    .replace(REGEX_CONTROLES_ASCII, '')
    .replace(REGEX_INVISIVEIS_UNICODE, '')
    .trim();
}

const conteudoIA = z
  .string()
  .transform(limparCaracteresInvisiveis)
  .pipe(
    z
      .string()
      .min(1, 'O campo content é obrigatório.')
      .max(2000, 'A mensagem não pode ultrapassar 2000 caracteres.'),
  );

export const EnviarMensagemSchema = z.object({
  content: conteudoIA,
});

export const CriarConversaSchema = z.object({
  mensagem_inicial: conteudoIA.optional(),
});
