import bloquearAutocadastroMiddleware from '../BloquearAutocadastroMiddleware.js';

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('BloquearAutocadastroMiddleware', () => {
  it('retorna 403 e não deixa a requisição seguir para o Better Auth', () => {
    const res = buildRes();

    bloquearAutocadastroMiddleware({}, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: true,
        code: 403,
        message:
          'Autocadastro desabilitado. Solicite um convite ao administrador.',
      }),
    );
  });
});
