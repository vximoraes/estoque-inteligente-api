import mongoose from 'mongoose';
import { EstoqueSchema, EstoqueUpdateSchema } from '../EstoqueSchema.js';

describe('EstoqueSchema', () => {
  const item = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();

  it('deve validar dados válidos com quantidade numérica', () => {
    const resultado = EstoqueSchema.parse({
      quantidade: 10,
      item,
      localizacao,
    });
    expect(resultado.quantidade).toBe(10);
  });

  it('deve converter quantidade em string para número', () => {
    const resultado = EstoqueSchema.parse({
      quantidade: '25',
      item,
      localizacao,
    });
    expect(resultado.quantidade).toBe(25);
  });

  it('deve lançar erro quando quantidade é negativa', () => {
    expect(() =>
      EstoqueSchema.parse({ quantidade: -1, item, localizacao }),
    ).toThrow('Quantidade mínima: 0');
  });

  it('deve lançar erro quando quantidade excede o máximo', () => {
    expect(() =>
      EstoqueSchema.parse({ quantidade: 1000000000, item, localizacao }),
    ).toThrow('Quantidade máxima: 999.999.999');
  });

  it('deve lançar erro quando item está ausente', () => {
    expect(() =>
      EstoqueSchema.parse({ quantidade: 10, localizacao }),
    ).toThrow();
  });

  it('deve lançar erro quando localizacao está ausente', () => {
    expect(() => EstoqueSchema.parse({ quantidade: 10, item })).toThrow();
  });

  it('deve lançar erro quando item não é um ObjectId válido', () => {
    expect(() =>
      EstoqueSchema.parse({ quantidade: 10, item: 'id-invalido', localizacao }),
    ).toThrow();
  });
});

describe('EstoqueUpdateSchema', () => {
  it('deve aceitar objeto vazio', () => {
    const resultado = EstoqueUpdateSchema.parse({});
    expect(resultado.quantidade).toBeUndefined();
  });

  it('deve validar atualização parcial de quantidade', () => {
    const resultado = EstoqueUpdateSchema.parse({ quantidade: 5 });
    expect(resultado.quantidade).toBe(5);
  });
});
