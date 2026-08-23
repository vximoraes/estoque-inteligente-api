import mongoose from 'mongoose';
import {
  PatrimonioQuerySchema,
  PatrimonioIdSchema,
} from '../PatrimonioQuerySchema.js';

describe('PatrimonioIdSchema', () => {
  it('deve validar ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(() => PatrimonioIdSchema.parse(id)).not.toThrow();
  });

  it('deve rejeitar ObjectId inválido', () => {
    expect(() => PatrimonioIdSchema.parse('abc')).toThrow('ID inválido');
  });
});

describe('PatrimonioQuerySchema', () => {
  it('deve aceitar query vazia com defaults de paginação', () => {
    const resultado = PatrimonioQuerySchema.parse({});
    expect(resultado.page).toBe(1);
    expect(resultado.limite).toBe(10);
  });

  it('deve validar status dentro do enum', () => {
    expect(() =>
      PatrimonioQuerySchema.parse({ status: 'Disponível' }),
    ).not.toThrow();
    expect(() =>
      PatrimonioQuerySchema.parse({ status: 'Perdido' }),
    ).toThrow();
  });

  it('deve rejeitar item com formato inválido', () => {
    expect(() => PatrimonioQuerySchema.parse({ item: '123' })).toThrow(
      'Item inválido',
    );
  });

  it('deve rejeitar ativo fora de true/false', () => {
    expect(() => PatrimonioQuerySchema.parse({ ativo: 'talvez' })).toThrow();
  });

  it('deve rejeitar limite acima de 100', () => {
    expect(() => PatrimonioQuerySchema.parse({ limite: '101' })).toThrow();
  });
});
