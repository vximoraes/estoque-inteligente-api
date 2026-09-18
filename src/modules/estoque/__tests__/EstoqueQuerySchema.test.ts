import mongoose from 'mongoose';
import { EstoqueQuerySchema, EstoqueIdSchema } from '../EstoqueQuerySchema.js';

describe('EstoqueQuerySchema', () => {
  it('deve validar query vazia', () => {
    const resultado = EstoqueQuerySchema.parse({});
    expect(resultado.item).toBeUndefined();
  });

  it('deve validar item como ObjectId válido', () => {
    const item = new mongoose.Types.ObjectId().toString();
    const resultado = EstoqueQuerySchema.parse({ item });
    expect(resultado.item).toBe(item);
  });

  it('deve lançar erro quando item não é um ObjectId válido', () => {
    expect(() => EstoqueQuerySchema.parse({ item: 'id-invalido' })).toThrow();
  });

  it('deve aceitar status válido', () => {
    const resultado = EstoqueQuerySchema.parse({ status: 'Em Estoque' });
    expect(resultado.status).toBe('Em Estoque');
  });

  it('deve lançar erro quando status é inválido', () => {
    expect(() => EstoqueQuerySchema.parse({ status: 'Qualquer' })).toThrow(
      "Status deve ser 'Indisponível', 'Baixo Estoque' ou 'Em Estoque'",
    );
  });

  it('deve remover espaços em branco do nome', () => {
    const resultado = EstoqueQuerySchema.parse({ nome: '  Resistor  ' });
    expect(resultado.nome).toBe('Resistor');
  });

  it('deve aceitar ordenar no formato campo:direcao', () => {
    const resultado = EstoqueQuerySchema.parse({ ordenar: 'quantidade:asc' });
    expect(resultado.ordenar).toBe('quantidade:asc');
  });

  it('deve lançar erro quando ordenar usa campo não permitido', () => {
    expect(() =>
      EstoqueQuerySchema.parse({ ordenar: 'campo-invalido:asc' }),
    ).toThrow('Ordenação inválida');
  });
});

describe('EstoqueIdSchema', () => {
  it('deve validar um ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(EstoqueIdSchema.parse(id)).toBe(id);
  });

  it('deve lançar erro para um id inválido', () => {
    expect(() => EstoqueIdSchema.parse('id-invalido')).toThrow();
  });
});
