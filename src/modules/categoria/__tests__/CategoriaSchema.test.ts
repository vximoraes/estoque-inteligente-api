import { CategoriaSchema, CategoriaUpdateSchema } from '../CategoriaSchema.js';

describe('CategoriaSchema', () => {
  it('deve validar dados válidos corretamente', () => {
    const dadosValidos = {
      nome: 'Items',
      tipo: 'consumo' as const,
      ativo: false,
    };
    const resultado = CategoriaSchema.parse(dadosValidos);
    expect(resultado).toEqual(dadosValidos);
  });

  it('deve aplicar valor padrão para "ativo" quando não fornecido', () => {
    const dadosValidos = {
      nome: 'Sensores',
      tipo: 'consumo' as const,
    };
    const resultado = CategoriaSchema.parse(dadosValidos);
    expect(resultado.ativo).toBe(true);
  });

  it('deve lançar erro quando "nome" está ausente', () => {
    const dadosInvalidos = {
      tipo: 'consumo' as const,
      ativo: true,
    };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow(/Required/);
  });

  it('deve lançar erro quando "nome" está vazio', () => {
    const dadosInvalidos = {
      nome: '',
      tipo: 'consumo' as const,
      ativo: true,
    };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow(/obrigat/);
  });

  it('deve lançar erro quando "ativo" não é booleano', () => {
    const dadosInvalidos = {
      nome: 'Placas',
      tipo: 'consumo' as const,
      ativo: 'sim',
    };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve lançar erro quando "tipo" está ausente', () => {
    const dadosInvalidos = { nome: 'Placas' };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow(
      "Tipo deve ser 'consumo' ou 'permanente'",
    );
  });

  it('deve lançar erro quando "tipo" não é "consumo" nem "permanente"', () => {
    const dadosInvalidos = { nome: 'Placas', tipo: 'invalido' };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow(
      "Tipo deve ser 'consumo' ou 'permanente'",
    );
  });

  it('deve aceitar descricao opcional', () => {
    const dadosValidos = {
      nome: 'Placas',
      tipo: 'consumo' as const,
      descricao: 'Placas eletrônicas',
    };
    const resultado = CategoriaSchema.parse(dadosValidos);
    expect(resultado.descricao).toBe('Placas eletrônicas');
  });

  it('deve aceitar ausência de descricao', () => {
    const resultado = CategoriaSchema.parse({
      nome: 'Placas',
      tipo: 'consumo',
    });
    expect(resultado.descricao).toBeUndefined();
  });

  it('deve lançar erro quando descricao excede 200 caracteres', () => {
    const dadosInvalidos = {
      nome: 'Placas',
      tipo: 'consumo' as const,
      descricao: 'a'.repeat(201),
    };
    expect(() => CategoriaSchema.parse(dadosInvalidos)).toThrow(
      'A descrição deve ter no máximo 200 caracteres.',
    );
  });
});

describe('CategoriaUpdateSchema', () => {
  it('deve validar dados parciais corretamente', () => {
    const dadosParciais = { nome: 'Novo Nome' };
    const resultado = CategoriaUpdateSchema.parse(dadosParciais);
    expect(resultado.nome).toBe('Novo Nome');
    expect(resultado.ativo).toBeUndefined();
  });

  it('deve aceitar objeto vazio e manter campos indefinidos', () => {
    const resultado = CategoriaUpdateSchema.parse({});
    expect(resultado.nome).toBeUndefined();
    expect(resultado.ativo).toBeUndefined();
  });

  it('deve lançar erro quando "nome" está vazio', () => {
    const dadosInvalidos = { nome: '' };
    expect(() => CategoriaUpdateSchema.parse(dadosInvalidos)).toThrow(
      /obrigat/,
    );
  });

  it('deve lançar erro quando "ativo" não é booleano', () => {
    const dadosInvalidos = { ativo: 'sim' };
    expect(() => CategoriaUpdateSchema.parse(dadosInvalidos)).toThrow();
  });

  it('deve validar atualização parcial da descricao', () => {
    const resultado = CategoriaUpdateSchema.parse({
      descricao: 'Nova descrição',
    });
    expect(resultado.descricao).toBe('Nova descrição');
  });
});
