import mongoose from 'mongoose';
import {
  PatrimonioSchema,
  PatrimonioLoteSchema,
  PatrimonioUpdateSchema,
  PatrimonioStatusSchema,
  PatrimonioLocalizacaoSchema,
} from '../PatrimonioSchema.js';

describe('PatrimonioSchema', () => {
  const categoria = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();

  it('deve validar dados válidos', () => {
    const resultado = PatrimonioSchema.parse({
      categoria,
      numero_patrimonio: 'NB-0001',
      localizacao,
    });
    expect(resultado.numero_patrimonio).toBe('NB-0001');
  });

  it('deve lançar erro quando numero_patrimonio está vazio', () => {
    expect(() =>
      PatrimonioSchema.parse({ categoria, numero_patrimonio: '', localizacao }),
    ).toThrow();
  });

  it('deve lançar erro quando categoria não é ObjectId válido', () => {
    expect(() =>
      PatrimonioSchema.parse({
        categoria: '123',
        numero_patrimonio: 'NB-0001',
        localizacao,
      }),
    ).toThrow();
  });

  it('deve lançar erro quando data_aquisicao é inválida', () => {
    expect(() =>
      PatrimonioSchema.parse({
        categoria,
        numero_patrimonio: 'NB-0001',
        localizacao,
        data_aquisicao: 'não-é-uma-data',
      }),
    ).toThrow('Data de aquisição inválida');
  });

  describe('modelo, fabricante e status', () => {
    const base = { categoria, numero_patrimonio: 'NB-0001', localizacao };

    it('deve aceitar modelo, fabricante e status opcionais', () => {
      const resultado = PatrimonioSchema.parse({
        ...base,
        modelo: 'ThinkPad T14',
        fabricante: 'Lenovo',
        status: 'Manutenção',
      });
      expect(resultado.modelo).toBe('ThinkPad T14');
      expect(resultado.fabricante).toBe('Lenovo');
      expect(resultado.status).toBe('Manutenção');
    });

    it('deve aceitar ausência de modelo, fabricante e status', () => {
      const resultado = PatrimonioSchema.parse(base);
      expect(resultado.modelo).toBeUndefined();
      expect(resultado.fabricante).toBeUndefined();
      expect(resultado.status).toBeUndefined();
    });

    it('não deve aceitar status "Emprestado" no cadastro', () => {
      expect(() =>
        PatrimonioSchema.parse({ ...base, status: 'Emprestado' }),
      ).toThrow();
    });
  });

  describe('campos_personalizados', () => {
    const base = { categoria, numero_patrimonio: 'NB-0001', localizacao };

    it('deve aceitar ausência de campos_personalizados', () => {
      const resultado = PatrimonioSchema.parse(base);
      expect(resultado.campos_personalizados).toBeUndefined();
    });

    it('deve aceitar lista vazia e campos válidos preservando a ordem', () => {
      const campos = [
        { chave: 'Memória RAM', valor: '16GB' },
        { chave: 'Número de série', valor: 'SN12345' },
      ];
      const resultado = PatrimonioSchema.parse({
        ...base,
        campos_personalizados: campos,
      });
      expect(resultado.campos_personalizados).toEqual(campos);
    });

    it('deve rejeitar mais de 20 campos', () => {
      const campos = Array.from({ length: 21 }, (_, i) => ({
        chave: `Campo ${i}`,
        valor: 'valor',
      }));
      expect(() =>
        PatrimonioSchema.parse({ ...base, campos_personalizados: campos }),
      ).toThrow(/Máximo de 20/);
    });

    it('deve rejeitar chave duplicada (case-insensitive)', () => {
      const campos = [
        { chave: 'Memória RAM', valor: '16GB' },
        { chave: 'memória ram', valor: '32GB' },
      ];
      expect(() =>
        PatrimonioSchema.parse({ ...base, campos_personalizados: campos }),
      ).toThrow(/duplicado/);
    });

    it('deve rejeitar chave ou valor vazios', () => {
      expect(() =>
        PatrimonioSchema.parse({
          ...base,
          campos_personalizados: [{ chave: '', valor: 'algo' }],
        }),
      ).toThrow();
      expect(() =>
        PatrimonioSchema.parse({
          ...base,
          campos_personalizados: [{ chave: 'Fabricante', valor: '' }],
        }),
      ).toThrow();
    });

    it('deve aparar espaços de chave e valor', () => {
      const resultado = PatrimonioSchema.parse({
        ...base,
        campos_personalizados: [{ chave: '  Fabricante  ', valor: '  Dell  ' }],
      });
      expect(resultado.campos_personalizados).toEqual([
        { chave: 'Fabricante', valor: 'Dell' },
      ]);
    });
  });
});

describe('PatrimonioLoteSchema', () => {
  const categoria = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();

  it('deve validar lote válido e aplicar numero_inicial padrão', () => {
    const resultado = PatrimonioLoteSchema.parse({
      categoria,
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
        categoria,
        localizacao,
        quantidade: '0',
        prefixo: 'NB',
      }),
    ).toThrow();

    expect(() =>
      PatrimonioLoteSchema.parse({
        categoria,
        localizacao,
        quantidade: '501',
        prefixo: 'NB',
      }),
    ).toThrow();
  });

  it('deve rejeitar prefixo vazio', () => {
    expect(() =>
      PatrimonioLoteSchema.parse({
        categoria,
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

  it('deve aceitar atualização só de campos_personalizados', () => {
    const resultado = PatrimonioUpdateSchema.parse({
      campos_personalizados: [{ chave: 'Fabricante', valor: 'Lenovo' }],
    });
    expect(resultado.campos_personalizados).toEqual([
      { chave: 'Fabricante', valor: 'Lenovo' },
    ]);
  });

  it('deve rejeitar chave duplicada também na atualização', () => {
    expect(() =>
      PatrimonioUpdateSchema.parse({
        campos_personalizados: [
          { chave: 'Fabricante', valor: 'Lenovo' },
          { chave: 'Fabricante', valor: 'Dell' },
        ],
      }),
    ).toThrow(/duplicado/);
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
    expect(() => PatrimonioStatusSchema.parse({ status: 'Perdido' })).toThrow();
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
