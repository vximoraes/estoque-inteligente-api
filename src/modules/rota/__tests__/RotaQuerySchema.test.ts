import mongoose from 'mongoose';
import { RotaQuerySchema, RotaIdSchema } from '../RotaQuerySchema.js';

describe('RotaIdSchema', () => {
  it('deve validar um ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(RotaIdSchema.parse(id)).toBe(id);
  });

  it('deve lançar erro para um id inválido', () => {
    expect(() => RotaIdSchema.parse('id-invalido')).toThrow();
  });
});

describe('RotaQuerySchema', () => {
  it('deve validar query vazia', () => {
    const resultado = RotaQuerySchema.parse({});
    expect(resultado.rota).toBeUndefined();
  });

  it('deve remover espaços em branco do nome da rota', () => {
    const resultado = RotaQuerySchema.parse({ rota: '  itens  ' });
    expect(resultado.rota).toBe('itens');
  });

  it('deve lançar erro quando rota é composta só de espaços', () => {
    expect(() => RotaQuerySchema.parse({ rota: '   ' })).toThrow(
      'Rota não pode ser vazia',
    );
  });

  it('deve converter page e limite para número', () => {
    const resultado = RotaQuerySchema.parse({ page: '2', limite: '10' });
    expect(resultado.page).toBe(2);
    expect(resultado.limite).toBe(10);
  });

  it('deve aplicar page e limite padrão quando ausentes', () => {
    const resultado = RotaQuerySchema.parse({});
    expect(resultado.page).toBe(1);
    expect(resultado.limite).toBe(10);
  });
});
