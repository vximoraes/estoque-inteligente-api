import {
  EmprestimoIdSchema,
  EmprestimoQuerySchema,
  EmprestimoTendenciaQuerySchema,
} from '../EmprestimoQuerySchema.js';
import mongoose from 'mongoose';

describe('EmprestimoIdSchema', () => {
  it('deve validar um ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(EmprestimoIdSchema.parse(id)).toBe(id);
  });

  it('deve lançar erro para id inválido', () => {
    expect(() => EmprestimoIdSchema.parse('id-invalido')).toThrow(
      'ID invalido',
    );
  });
});

describe('EmprestimoQuerySchema', () => {
  it('deve aplicar page e limite padrão quando ausentes', () => {
    const resultado = EmprestimoQuerySchema.parse({});
    expect(resultado.page).toBe(1);
    expect(resultado.limite).toBe(10);
  });

  it('deve converter page e limite para número', () => {
    const resultado = EmprestimoQuerySchema.parse({ page: '2', limite: '20' });
    expect(resultado.page).toBe(2);
    expect(resultado.limite).toBe(20);
  });

  it('deve lançar erro quando limite excede 100', () => {
    expect(() => EmprestimoQuerySchema.parse({ limite: '101' })).toThrow(
      'limite deve ser inteiro entre 1 e 100',
    );
  });

  it('deve aceitar tipo_controle válido', () => {
    const resultado = EmprestimoQuerySchema.parse({
      tipo_controle: 'unidade',
    });
    expect(resultado.tipo_controle).toBe('unidade');
  });

  it('deve lançar erro quando tipo_controle é inválido', () => {
    expect(() =>
      EmprestimoQuerySchema.parse({ tipo_controle: 'invalido' }),
    ).toThrow();
  });

  it('deve lançar erro quando apenas_abertos não é true/false', () => {
    expect(() =>
      EmprestimoQuerySchema.parse({ apenas_abertos: 'talvez' }),
    ).toThrow("apenas_abertos deve ser 'true' ou 'false'");
  });

  it('deve converter data_saida_inicio no formato YYYY-MM-DD para Date', () => {
    const resultado = EmprestimoQuerySchema.parse({
      data_saida_inicio: '2026-01-01',
    });
    expect(resultado.data_saida_inicio).toBeInstanceOf(Date);
  });

  it('deve lançar erro quando data_saida_inicio tem formato inválido', () => {
    expect(() =>
      EmprestimoQuerySchema.parse({ data_saida_inicio: '01/01/2026' }),
    ).toThrow('data_saida_inicio deve estar no formato YYYY-MM-DD');
  });
});

describe('EmprestimoTendenciaQuerySchema', () => {
  it('deve aceitar meses válido', () => {
    const resultado = EmprestimoTendenciaQuerySchema.parse({ meses: '12' });
    expect(resultado.meses).toBe(12);
  });

  it('deve lançar erro quando meses não é 6, 12 ou 24', () => {
    expect(() => EmprestimoTendenciaQuerySchema.parse({ meses: '3' })).toThrow(
      'meses deve ser 6, 12 ou 24',
    );
  });

  it('deve aceitar data_inicio e data_fim no formato correto', () => {
    const resultado = EmprestimoTendenciaQuerySchema.parse({
      data_inicio: '2026-01-01',
      data_fim: '2026-06-01',
    });
    expect(resultado.data_inicio).toBe('2026-01-01');
  });
});
