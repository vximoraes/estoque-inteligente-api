import { z } from 'zod';

function limparCaracteresControle(valor: string): string {
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
}

const conteudoIA = z
  .string()
  .transform(limparCaracteresControle)
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
