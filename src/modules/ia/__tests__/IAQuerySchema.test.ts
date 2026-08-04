import mongoose from 'mongoose';
import {
  ConversaIdSchema,
  ListarConversasQuerySchema,
} from '../IAQuerySchema.js';

describe('ConversaIdSchema', () => {
  it('deve aceitar um ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    expect(() => ConversaIdSchema.parse(id)).not.toThrow();
  });

  it('deve rejeitar um id inválido', () => {
    expect(() => ConversaIdSchema.parse('id-invalido')).toThrow();
  });
});

describe('ListarConversasQuerySchema', () => {
  it('deve aplicar defaults quando query vazia', () => {
    const resultado = ListarConversasQuerySchema.parse({});
    expect(resultado.page).toBe(1);
    expect(resultado.limite).toBe(20);
  });

  it('deve converter page e limite para número', () => {
    const resultado = ListarConversasQuerySchema.parse({
      page: '2',
      limite: '10',
    });
    expect(resultado.page).toBe(2);
    expect(resultado.limite).toBe(10);
  });

  it('deve rejeitar limite acima de 50', () => {
    expect(() =>
      ListarConversasQuerySchema.parse({ limite: '51' }),
    ).toThrow();
  });

  it('deve rejeitar page menor ou igual a 0', () => {
    expect(() => ListarConversasQuerySchema.parse({ page: '0' })).toThrow();
  });
});
