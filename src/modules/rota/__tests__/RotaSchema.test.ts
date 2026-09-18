import { RotaSchema, RotaUpdateSchema } from '../RotaSchema.js';

describe('RotaSchema', () => {
  it('deve validar dados válidos com defaults de permissão', () => {
    const resultado = RotaSchema.parse({ rota: 'itens' });
    expect(resultado.rota).toBe('itens');
    expect(resultado.ativo).toBe(true);
    expect(resultado.buscar).toBe(false);
    expect(resultado.enviar).toBe(false);
    expect(resultado.substituir).toBe(false);
    expect(resultado.modificar).toBe(false);
    expect(resultado.excluir).toBe(false);
  });

  it('deve aceitar flags de permissão explícitas', () => {
    const resultado = RotaSchema.parse({
      rota: 'itens',
      buscar: true,
      enviar: true,
    });
    expect(resultado.buscar).toBe(true);
    expect(resultado.enviar).toBe(true);
  });

  it('deve lançar erro quando rota está ausente', () => {
    expect(() => RotaSchema.parse({})).toThrow();
  });

  it('deve lançar erro quando rota está vazia', () => {
    expect(() => RotaSchema.parse({ rota: '' })).toThrow(
      'O campo rota é obrigatório.',
    );
  });

  it('deve lançar erro quando _id não é um ObjectId válido', () => {
    expect(() =>
      RotaSchema.parse({ rota: 'itens', _id: 'id-invalido' }),
    ).toThrow();
  });
});

describe('RotaUpdateSchema', () => {
  it('deve aceitar objeto vazio', () => {
    const resultado = RotaUpdateSchema.parse({});
    expect(resultado.rota).toBeUndefined();
  });

  it('deve validar atualização parcial de uma flag de permissão', () => {
    const resultado = RotaUpdateSchema.parse({ excluir: true });
    expect(resultado.excluir).toBe(true);
  });
});
