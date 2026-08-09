import { ItemSchema, ItemUpdateSchema } from '../ItemSchema.js';
import mongoose from 'mongoose';

describe('ItemSchema', () => {
  const objectId = new mongoose.Types.ObjectId().toString();

  it('deve validar dados válidos corretamente', () => {
    const dadosValidos = {
      nome: 'Resistor',
      estoque_minimo: '10',
      descricao: 'Resistor 1k',
      imagem: 'imagem.png',
      categoria: objectId,
      ativo: false,
    };
    const resultado = ItemSchema.parse(dadosValidos);
    expect(resultado.nome).toBe('Resistor');
    expect(resultado.estoque_minimo).toBe(10);
    expect(resultado.descricao).toBe('Resistor 1k');
    expect(resultado.imagem).toBe('imagem.png');
    expect(resultado.categoria).toBe(objectId);
    expect(resultado.ativo).toBe(false);
  });

  it('deve aplicar valor padrão para "ativo" quando não fornecido', () => {
    const dadosValidos = {
      nome: 'Capacitor',
      estoque_minimo: '5',
      categoria: objectId,
    };
    const resultado = ItemSchema.parse(dadosValidos);
    expect(resultado.ativo).toBe(true);
  });

  it('deve lançar erro quando "nome" está ausente', () => {
    const dadosInvalidos = {
      estoque_minimo: '10',
      categoria: objectId,
    };
    expect(() => ItemSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve lançar erro quando "nome" está vazio', () => {
    const dadosInvalidos = {
      nome: '   ',
      estoque_minimo: '10',
      categoria: objectId,
    };
    expect(() => ItemSchema.parse(dadosInvalidos)).toThrow(
      'Nome não pode ser vazio',
    );
  });

  it('deve lançar erro quando "estoque_minimo" não é número', () => {
    const dadosInvalidos = {
      nome: 'Resistor',
      estoque_minimo: 'dez',
      categoria: objectId,
    };
    expect(() => ItemSchema.parse(dadosInvalidos)).toThrow(
      'Estoque mínimo deve ser inteiro',
    );
  });

  it('deve lançar erro quando "categoria" não é ObjectId', () => {
    const dadosInvalidos = {
      nome: 'Resistor',
      estoque_minimo: '10',
      categoria: '123',
    };
    expect(() => ItemSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve lançar erro quando "ativo" não é booleano', () => {
    const dadosInvalidos = {
      nome: 'Resistor',
      estoque_minimo: '10',
      categoria: objectId,
      ativo: 'sim',
    };
    expect(() => ItemSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve tratar corretamente valores undefined para estoque_minimo', () => {
    const dados = {
      nome: 'Resistor',
      estoque_minimo: '',
      categoria: objectId,
    };
    const resultado = ItemSchema.parse(dados);
    expect(resultado.estoque_minimo).toBeUndefined();
  });

  it('deve remover espaços em branco do nome', () => {
    const dados = {
      nome: '  Resistor  ',
      estoque_minimo: '10',
      categoria: objectId,
    };
    const resultado = ItemSchema.parse(dados);
    expect(resultado.nome).toBe('Resistor');
  });
});

describe('ItemUpdateSchema', () => {
  const objectId = new mongoose.Types.ObjectId().toString();

  it('deve validar dados parciais corretamente', () => {
    const dadosParciais = { nome: 'Novo Nome' };
    const resultado = ItemUpdateSchema.parse(dadosParciais);
    expect(resultado.nome).toBe('Novo Nome');
  });

  it('deve aceitar objeto vazio e manter campos indefinidos', () => {
    const resultado = ItemUpdateSchema.parse({});
    expect(resultado.nome).toBeUndefined();
    expect(resultado.estoque_minimo).toBeUndefined();
    expect(resultado.categoria).toBeUndefined();
    expect(resultado.ativo).toBeUndefined();
  });

  it('deve lançar erro quando "nome" está vazio', () => {
    const dadosInvalidos = { nome: '   ' };
    expect(() => ItemUpdateSchema.parse(dadosInvalidos)).toThrow(
      'Nome não pode ser vazio',
    );
  });

  it('deve lançar erro quando "estoque_minimo" não é número', () => {
    const dadosInvalidos = { estoque_minimo: 'dez' };
    expect(() => ItemUpdateSchema.parse(dadosInvalidos)).toThrow(
      'Estoque mínimo deve ser inteiro',
    );
  });

  it('deve lançar erro quando "categoria" não é ObjectId', () => {
    const dadosInvalidos = { categoria: '123' };
    expect(() => ItemUpdateSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve lançar erro quando "ativo" não é booleano', () => {
    const dadosInvalidos = { ativo: 'sim' };
    expect(() => ItemUpdateSchema.parse(dadosInvalidos)).toThrow();
  });
});
