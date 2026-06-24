import ItemFilterBuilder from '../../../../repositories/filters/ItemFilterBuilder.js';

jest.mock('../../../../models/Item.js', () => {
  return 'mock-item-model';
});

jest.mock('../../../../modules/localizacao/LocalizacaoModel.js', () => {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
  };
});

jest.mock('../../../../models/Categoria.js', () => {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
  };
});

jest.mock('../../../../models/Movimentacao.js', () => {
  return {
    exists: jest.fn(),
  };
});

jest.mock('mongoose', () => {
  return {
    Types: {
      ObjectId: {
        isValid: jest.fn(),
      },
    },
    Schema: {
      Types: {
        ObjectId: 'ObjectId',
      },
    },
  };
});

import mongoose from 'mongoose';
import Localizacao from '../../../../modules/localizacao/LocalizacaoModel.js';
import Categoria from '../../../../models/Categoria.js';
import ItemRepository from '../../../../repositories/ItemRepository.js';

jest.mock('../../../../repositories/ItemRepository.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('ItemFilterBuilder', () => {
  let itemFilterBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    itemFilterBuilder = new ItemFilterBuilder();
  });

  describe('constructor', () => {
    test('deve inicializar com filtros vazios', () => {
      expect(itemFilterBuilder.filtros).toEqual({});
    });

    test('deve inicializar com instância de ItemRepository', () => {
      expect(itemFilterBuilder.itemRepository).toBeTruthy();
    });

    test('deve inicializar com referência ao ItemModel', () => {
      expect(itemFilterBuilder.itemModel).toBe('mock-item-model');
    });
  });

  describe('comNome', () => {
    test('deve adicionar filtro de nome quando nome é fornecido', () => {
      const nome = 'Resistor';
      const resultado = itemFilterBuilder.comNome(nome);

      expect(itemFilterBuilder.filtros.nome).toEqual({
        $regex: nome,
        $options: 'i',
      });
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('não deve adicionar filtro para valores inválidos (undefined, null, string vazia)', () => {
      [undefined, null, ''].forEach((valor) => {
        itemFilterBuilder.filtros = {}; // Reset
        const resultado = itemFilterBuilder.comNome(valor);
        expect(itemFilterBuilder.filtros.nome).toBeUndefined();
        expect(resultado).toBe(itemFilterBuilder);
      });
    });
  });

  describe('comQuantidade', () => {
    test('deve adicionar filtro de quantidade quando quantidade é número válido como string', () => {
      const quantidade = '10';
      const resultado = itemFilterBuilder.comQuantidade(quantidade);

      expect(itemFilterBuilder.filtros.quantidade).toBe(10);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve adicionar filtro de quantidade quando quantidade é número', () => {
      const quantidade = 15;
      const resultado = itemFilterBuilder.comQuantidade(quantidade);

      expect(itemFilterBuilder.filtros.quantidade).toBe(15);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('não deve adicionar filtro para valores inválidos (undefined, null, string vazia, não-numérico)', () => {
      [undefined, null, '', 'abc'].forEach((valor) => {
        itemFilterBuilder.filtros = {}; // Reset
        const resultado = itemFilterBuilder.comQuantidade(valor);
        expect(itemFilterBuilder.filtros.quantidade).toBeUndefined();
        expect(resultado).toBe(itemFilterBuilder);
      });
    });
  });

  describe('comEstoqueMinimo', () => {
    test('deve adicionar filtro de estoque mínimo quando valor é "true"', () => {
      const resultado = itemFilterBuilder.comEstoqueMinimo('true');

      expect(itemFilterBuilder.filtros.$expr).toEqual({
        $lt: ['$quantidade', '$estoque_minimo'],
      });
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('não deve adicionar filtro para valores inválidos (não "true")', () => {
      ['false', undefined, null, ''].forEach((valor) => {
        itemFilterBuilder.filtros = {}; // Reset
        const resultado = itemFilterBuilder.comEstoqueMinimo(valor);
        expect(itemFilterBuilder.filtros.$expr).toBeUndefined();
        expect(resultado).toBe(itemFilterBuilder);
      });
    });
  });

  describe('comCategoria', () => {
    test('deve adicionar filtro com categoria quando é ObjectId válido e categoria existe', async () => {
      const categoriaId = 'validObjectId';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      const mockCategoria = { _id: categoriaId, categoria: 'Resistores' };
      Categoria.findById.mockResolvedValue(mockCategoria);

      const resultado = await itemFilterBuilder.comCategoria(categoriaId);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(categoriaId);
      expect(Categoria.findById).toHaveBeenCalledWith(categoriaId);
      expect(itemFilterBuilder.filtros.categoria).toBe(categoriaId);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve definir filtro como vazio quando ObjectId é válido mas categoria não existe', async () => {
      const categoriaId = 'validObjectId';
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      Categoria.findById.mockResolvedValue(null);

      const resultado = await itemFilterBuilder.comCategoria(categoriaId);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(categoriaId);
      expect(Categoria.findById).toHaveBeenCalledWith(categoriaId);
      expect(itemFilterBuilder.filtros.categoria).toEqual({ $in: [] });
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve buscar categoria por nome e adicionar filtro quando categoria existe', async () => {
      const categoriaNome = 'Resistores';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      const mockCategoria = { _id: 'someId', categoria: categoriaNome };
      Categoria.findOne.mockResolvedValue(mockCategoria);

      const resultado = await itemFilterBuilder.comCategoria(categoriaNome);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        categoriaNome,
      );
      expect(Categoria.findOne).toHaveBeenCalledWith({
        nome: { $regex: categoriaNome, $options: 'i' },
      });
      expect(itemFilterBuilder.filtros.categoria).toBe('someId');
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve definir filtro como vazio quando categoria por nome não existe', async () => {
      const categoriaNome = 'Categoria Inexistente';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);
      Categoria.findOne.mockResolvedValue(null);

      const resultado = await itemFilterBuilder.comCategoria(categoriaNome);

      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        categoriaNome,
      );
      expect(Categoria.findOne).toHaveBeenCalledWith({
        nome: { $regex: categoriaNome, $options: 'i' },
      });
      expect(itemFilterBuilder.filtros.categoria).toEqual({ $in: [] });
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('não deve adicionar filtro para valores inválidos', async () => {
      const valoresInvalidos = [undefined, null, ''];

      for (const valor of valoresInvalidos) {
        itemFilterBuilder.filtros = {}; // Reset
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const resultado = await itemFilterBuilder.comCategoria(valor);

        expect(mongoose.Types.ObjectId.isValid).not.toHaveBeenCalled();
        expect(Categoria.findById).not.toHaveBeenCalled();
        expect(Categoria.findOne).not.toHaveBeenCalled();
        expect(itemFilterBuilder.filtros.categoria).toBeUndefined();
        expect(resultado).toBe(itemFilterBuilder);

        jest.clearAllMocks();
      }
    });
  });

  describe('comAtivo', () => {
    test('deve definir filtro como true quando ativo é "true"', () => {
      const resultado = itemFilterBuilder.comAtivo('true');

      expect(itemFilterBuilder.filtros.ativo).toBe(true);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve definir filtro como false quando ativo é "false"', () => {
      const resultado = itemFilterBuilder.comAtivo('false');

      expect(itemFilterBuilder.filtros.ativo).toBe(false);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('deve definir filtro como true quando ativo é undefined (usando valor padrão)', () => {
      const resultado = itemFilterBuilder.comAtivo();

      expect(itemFilterBuilder.filtros.ativo).toBe(true);
      expect(resultado).toBe(itemFilterBuilder);
    });

    test('não deve adicionar filtro quando ativo não é "true" nem "false"', () => {
      const resultado = itemFilterBuilder.comAtivo('outro');

      expect(itemFilterBuilder.filtros.ativo).toBeUndefined();
      expect(resultado).toBe(itemFilterBuilder);
    });
  });

  describe('build', () => {
    test('deve retornar filtros vazios quando nenhum filtro foi adicionado', () => {
      const filtros = itemFilterBuilder.build();
      expect(filtros).toEqual({});
    });

    test('deve retornar todos os filtros adicionados corretamente', () => {
      itemFilterBuilder.comNome('Resistor');
      itemFilterBuilder.comQuantidade('10');
      itemFilterBuilder.comEstoqueMinimo('true');
      itemFilterBuilder.comAtivo('false');
      itemFilterBuilder.filtros.localizacao = 'localizacaoId';
      itemFilterBuilder.filtros.categoria = 'categoriaId';

      const filtros = itemFilterBuilder.build();

      expect(filtros).toEqual({
        nome: { $regex: 'Resistor', $options: 'i' },
        quantidade: 10,
        $expr: { $lt: ['$quantidade', '$estoque_minimo'] },
        ativo: false,
        localizacao: 'localizacaoId',
        categoria: 'categoriaId',
      });
    });
  });

  describe('Encadeamento de métodos (fluent interface)', () => {
    test('deve permitir encadear múltiplos métodos síncronos e construir filtros corretamente', () => {
      const filtros = itemFilterBuilder
        .comNome('Resistor')
        .comQuantidade('10')
        .comEstoqueMinimo('true')
        .comAtivo('false')
        .build();

      expect(filtros).toEqual({
        nome: { $regex: 'Resistor', $options: 'i' },
        quantidade: 10,
        $expr: { $lt: ['$quantidade', '$estoque_minimo'] },
        ativo: false,
      });
    });

    test('deve permitir encadear métodos com testes assíncronos', async () => {
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      Localizacao.findById.mockResolvedValue({
        _id: 'localizacaoId',
        localizacao: 'Prateleira A',
      });
      Categoria.findById.mockResolvedValue({
        _id: 'categoriaId',
        categoria: 'Resistores',
      });

      itemFilterBuilder.comNome('Resistor');
      itemFilterBuilder.comQuantidade('10');
      itemFilterBuilder.comAtivo('true');
      await itemFilterBuilder.comCategoria('categoriaId');

      const filtros = itemFilterBuilder.build();

      expect(filtros).toEqual({
        nome: { $regex: 'Resistor', $options: 'i' },
        quantidade: 10,
        ativo: true,
        categoria: 'categoriaId',
      });
    });
  });
});
