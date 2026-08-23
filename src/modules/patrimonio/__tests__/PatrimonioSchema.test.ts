import mongoose from 'mongoose';
import {
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
} from '../PatrimonioSchema.js';

describe('PatrimonioSchema', () => {
  const item = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();

  it('deve validar dados válidos', () => {
    const resultado = PatrimonioSchema.parse({
      item,
      numero_patrimonio: 'NB-0001',
      localizacao,
    });
    expect(resultado.numero_patrimonio).toBe('NB-0001');
  });

  it('deve lançar erro quando numero_patrimonio está vazio', () => {
    expect(() =>
      PatrimonioSchema.parse({ item, numero_patrimonio: '', localizacao }),
    ).toThrow();
  });

  it('deve lançar erro quando item não é ObjectId válido', () => {
    expect(() =>
      PatrimonioSchema.parse({
        item: '123',
        numero_patrimonio: 'NB-0001',
        localizacao,
      }),
    ).toThrow();
  });

  it('deve lançar erro quando data_aquisicao é inválida', () => {
    expect(() =>
      PatrimonioSchema.parse({
        item,
        numero_patrimonio: 'NB-0001',
        localizacao,
        data_aquisicao: 'não-é-uma-data',
      }),
    ).toThrow('Data de aquisição inválida');
  });
});

describe('PatrimonioLoteSchema', () => {
  const item = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();

  it('deve validar lote válido e aplicar numero_inicial padrão', () => {
    const resultado = PatrimonioLoteSchema.parse({
      item,
      localizacao,
      quantidade: '5',
      prefixo: 'NB',
    });
    expect(resultado.quantidade).toBe(5);
    expect(resultado.numero_inicial).toBe(1);
  });

  it('deve rejeitar quantidade fora do intervalo permitido', () => {
    expect(() =>
      PatrimonioLoteSchema.parse({
        item,
        localizacao,
        quantidade: '0',
        prefixo: 'NB',
      }),
    ).toThrow();

    expect(() =>
      PatrimonioLoteSchema.parse({
        item,
        localizacao,
        quantidade: '501',
        prefixo: 'NB',
      }),
    ).toThrow();
  });

  it('deve rejeitar prefixo vazio', () => {
    expect(() =>
      PatrimonioLoteSchema.parse({
        item,
        localizacao,
        quantidade: '5',
        prefixo: '',
      }),
    ).toThrow();
  });
});

describe('PatrimonioUpdateSchema', () => {
  it('não deve expor campos de status ou localização', () => {
    const resultado = PatrimonioUpdateSchema.parse({
      numero_patrimonio: 'NB-0099',
      // campos abaixo não existem no schema e são descartados pelo Zod
      status: 'Baixado',
      localizacao: new mongoose.Types.ObjectId().toString(),
    });
    expect(resultado).not.toHaveProperty('status');
    expect(resultado).not.toHaveProperty('localizacao');
  });

  it('deve aceitar objeto vazio', () => {
    expect(() => PatrimonioUpdateSchema.parse({})).not.toThrow();
  });
});

describe('PatrimonioStatusSchema', () => {
  it('deve aceitar Disponível, Manutenção e Baixado', () => {
    for (const status of ['Disponível', 'Manutenção', 'Baixado']) {
      expect(() => PatrimonioStatusSchema.parse({ status })).not.toThrow();
    }
  });

  it('não deve aceitar "Emprestado" como destino', () => {
    expect(() =>
      PatrimonioStatusSchema.parse({ status: 'Emprestado' }),
    ).toThrow();
  });

  it('não deve aceitar status desconhecido', () => {
    expect(() =>
      PatrimonioStatusSchema.parse({ status: 'Perdido' }),
    ).toThrow();
  });
});

describe('PatrimonioLocalizacaoSchema', () => {
  it('deve validar localizacao como ObjectId', () => {
    const localizacao = new mongoose.Types.ObjectId().toString();
    expect(() =>
      PatrimonioLocalizacaoSchema.parse({ localizacao }),
    ).not.toThrow();
  });

  it('deve rejeitar localizacao inválida', () => {
    expect(() =>
      PatrimonioLocalizacaoSchema.parse({ localizacao: 'abc' }),
    ).toThrow();
  });
});
