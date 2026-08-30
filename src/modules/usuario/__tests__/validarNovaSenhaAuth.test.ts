import mensagemSenhaInvalida from '../validarNovaSenhaAuth.js';

describe('validarNovaSenhaAuth', () => {
  it.each(['/reset-password', '/change-password'])(
    'rejeita senha sem complexidade em %s',
    (path) => {
      const erro = mensagemSenhaInvalida(path, { newPassword: 'aaaaaaaa' });
      expect(erro).toBe(
        'A senha deve conter pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',
      );
    },
  );

  it.each(['/reset-password', '/change-password'])(
    'aceita senha que atende a complexidade em %s',
    (path) => {
      const erro = mensagemSenhaInvalida(path, { newPassword: 'Senha@123' });
      expect(erro).toBeNull();
    },
  );

  it('ignora rotas que não trocam senha', () => {
    const erro = mensagemSenhaInvalida('/sign-in/email', {
      newPassword: 'aaaaaaaa',
    });
    expect(erro).toBeNull();
  });

  it('não quebra quando o body não tem newPassword', () => {
    const erro = mensagemSenhaInvalida('/reset-password', {});
    expect(erro).toBeNull();
  });
});
