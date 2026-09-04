import {
  MovimentacaoQuerySchema,
  MovimentacaoIdSchema,
  MovimentacaoTendenciaQuerySchema,
} from '../MovimentacaoQuerySchema.js';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}));

describe('MovimentacaoIdSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve aceitar um ID válido', () => {
    const validId = '64f234a0c781a7b30c2fe445';
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
    const result = MovimentacaoIdSchema.parse(validId);
    expect(result).toBe(validId);
    expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(validId);
  });

  it('deve rejeitar um ID inválido', () => {
    const invalidId = 'invalid-id';
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);
    expect(() => MovimentacaoIdSchema.parse(invalidId)).toThrow(ZodError);
    expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(invalidId);
  });
});

describe('MovimentacaoQuerySchema', () => {
  describe('Validação de tipo', () => {
    it('deve aceitar quando tipo é entrada', () => {
      const query = { tipo: 'entrada' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.tipo).toBe('entrada');
    });

    it('deve aceitar quando tipo é saida', () => {
      const query = { tipo: 'saida' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.tipo).toBe('saida');
    });

    it('deve rejeitar quando tipo é inválido', () => {
      const query = { tipo: 'invalido' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });

    it('deve aceitar quando tipo não é fornecido', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.tipo).toBeUndefined();
    });
  });

  describe('Validação de data', () => {
    it('deve aceitar e transformar uma data válida no formato YYYY-MM-DD', () => {
      const query = { data: '2025-05-28' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.data).toBeInstanceOf(Date);
      expect(result.data.toISOString()).toBe('2025-05-28T00:00:00.000Z');
    });

    it('deve rejeitar uma data em formato inválido', () => {
      const query = { data: '28/05/2025' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });
    it('deve normalizar uma data inexistente para a data válida mais próxima', () => {
      const query = { data: '2025-02-30' }; // 30 de fevereiro não existe
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.data).toBeInstanceOf(Date);
      expect(result.data.toISOString().startsWith('2025-03-02')).toBe(true);
    });

    it('deve aceitar quando data não é fornecida', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.data).toBeUndefined();
    });
  });

  describe('Validação de quantidade', () => {
    it('deve transformar quantidade de string para número', () => {
      const query = { quantidade: '10' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.quantidade).toBe(10);
      expect(typeof result.quantidade).toBe('number');
    });

    it('deve rejeitar quando quantidade não é um número inteiro válido', () => {
      const query = { quantidade: 'abc' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });

    it('deve aceitar quando quantidade não é fornecida', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.quantidade).toBeUndefined();
    });
  });

  describe('Validação de item', () => {
    it('deve aceitar e fazer trim em um item válido', () => {
      const query = { item: '  64f234a0c781a7b30c2fe445  ' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.item).toBe('64f234a0c781a7b30c2fe445');
    });

    it('deve aceitar quando item não é fornecido', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.item).toBeUndefined();
    });
  });

  describe('Validação de fornecedor', () => {
    it('deve aceitar e fazer trim em um fornecedor válido', () => {
      const query = { fornecedor: '  64f234a0c781a7b30c2fe446  ' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.fornecedor).toBe('64f234a0c781a7b30c2fe446');
    });

    it('deve aceitar quando fornecedor não é fornecido', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.fornecedor).toBeUndefined();
    });
  });

  describe('Validação de período (data_inicio/data_fim)', () => {
    it('deve aceitar e transformar data_inicio no início do dia UTC', () => {
      const query = { data_inicio: '2025-05-01' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.data_inicio.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    });

    it('deve aceitar e transformar data_fim no fim do dia UTC', () => {
      const query = { data_fim: '2025-05-31' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.data_fim.toISOString()).toBe('2025-05-31T23:59:59.999Z');
    });

    it('deve rejeitar data_inicio em formato inválido', () => {
      const query = { data_inicio: '01/05/2025' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });

    it('deve aceitar quando período não é fornecido', () => {
      const result = MovimentacaoQuerySchema.parse({});
      expect(result.data_inicio).toBeUndefined();
      expect(result.data_fim).toBeUndefined();
    });
  });

  describe('Validação de localizacao', () => {
    it('deve aceitar e fazer trim em uma localizacao válida', () => {
      const query = { localizacao: '  64f234a0c781a7b30c2fe447  ' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.localizacao).toBe('64f234a0c781a7b30c2fe447');
    });
  });

  describe('Validação de ordenar', () => {
    it('deve aceitar campo:direcao dentro da whitelist', () => {
      const query = { ordenar: 'data_hora:asc' };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result.ordenar).toBe('data_hora:asc');
    });

    it('deve rejeitar campo fora da whitelist', () => {
      const query = { ordenar: 'usuario:asc' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });

    it('deve rejeitar direção inválida', () => {
      const query = { ordenar: 'data_hora:cima' };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });
  });

  describe('Cenários completos', () => {
    it('deve validar um query completo com todos os campos', () => {
      const query = {
        tipo: 'entrada',
        data: '2025-05-28',
        quantidade: '10',
        item: '64f234a0c781a7b30c2fe445',
        fornecedor: '64f234a0c781a7b30c2fe446',
      };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result).toEqual({
        tipo: 'entrada',
        data: new Date('2025-05-28T00:00:00Z'),
        quantidade: 10,
        item: '64f234a0c781a7b30c2fe445',
        fornecedor: '64f234a0c781a7b30c2fe446',
      });
    });

    it('deve validar um query com campos parciais', () => {
      const query = {
        tipo: 'saida',
        item: '64f234a0c781a7b30c2fe445',
      };
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result).toEqual({
        tipo: 'saida',
        item: '64f234a0c781a7b30c2fe445',
      });
    });

    it('deve validar um query vazio', () => {
      const query = {};
      const result = MovimentacaoQuerySchema.parse(query);
      expect(result).toEqual({});
    });

    it('deve rejeitar um query com múltiplos campos inválidos', () => {
      const query = {
        tipo: 'invalido',
        data: '28/05/2025',
        quantidade: 'abc',
      };
      expect(() => MovimentacaoQuerySchema.parse(query)).toThrow(ZodError);
    });
  });
});

describe('MovimentacaoTendenciaQuerySchema', () => {
  it('aceita query vazio (meses fica undefined, resolvido depois no Repository)', () => {
    const result = MovimentacaoTendenciaQuerySchema.parse({});
    expect(result.meses).toBeUndefined();
    expect(result.data_inicio).toBeUndefined();
    expect(result.data_fim).toBeUndefined();
  });

  it('aceita meses dentro da whitelist', () => {
    const result = MovimentacaoTendenciaQuerySchema.parse({ meses: '24' });
    expect(result.meses).toBe(24);
  });

  it('rejeita meses fora da whitelist', () => {
    expect(() =>
      MovimentacaoTendenciaQuerySchema.parse({ meses: '18' }),
    ).toThrow(ZodError);
  });

  it('aceita e transforma data_inicio/data_fim, junto com meses (prioridade decidida no Repository)', () => {
    const result = MovimentacaoTendenciaQuerySchema.parse({
      meses: '6',
      data_inicio: '2026-01-01',
      data_fim: '2026-03-31',
    });
    expect(result.data_inicio?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(result.data_fim?.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });

  it('rejeita data_inicio em formato inválido', () => {
    expect(() =>
      MovimentacaoTendenciaQuerySchema.parse({ data_inicio: '01/01/2026' }),
    ).toThrow(ZodError);
  });
});
