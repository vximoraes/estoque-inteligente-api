import mongoose from 'mongoose';
import PatrimonioFilterBuilder from '../PatrimonioFilterBuilder.js';
import ItemModel from '../../item/ItemModel.js';
import CategoriaModel from '../../categoria/CategoriaModel.js';

describe('PatrimonioFilterBuilder', () => {
  it('deve retornar objeto vazio quando nenhum filtro é aplicado (exceto ativo default)', () => {
    const filtros = new PatrimonioFilterBuilder().build();
    expect(filtros).toEqual({});
  });

  it('comItem deve filtrar por ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder().comItem(id).build();
    expect(filtros['item']).toBeInstanceOf(mongoose.Types.ObjectId);
    expect((filtros['item'] as mongoose.Types.ObjectId).toString()).toBe(id);
  });

  it('comItem deve ignorar ObjectId inválido', () => {
    const filtros = new PatrimonioFilterBuilder().comItem('invalido').build();
    expect(filtros['item']).toBeUndefined();
  });

  it('comStatus deve aceitar apenas valores do enum', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comStatus('Disponível')
      .build();
    expect(filtros['status']).toBe('Disponível');

    const filtrosInvalidos = new PatrimonioFilterBuilder()
      .comStatus('Inexistente')
      .build();
    expect(filtrosInvalidos['status']).toBeUndefined();
  });

  it('comLocalizacao deve filtrar por ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder().comLocalizacao(id).build();
    expect((filtros['localizacao'] as mongoose.Types.ObjectId).toString()).toBe(
      id,
    );
  });

  it('comNumeroPatrimonio deve montar regex case-insensitive (escapando caracteres especiais)', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comNumeroPatrimonio('nb-001')
      .build();
    expect(filtros['numero_patrimonio']).toEqual({
      $regex: 'nb\\-001',
      $options: 'i',
    });
  });

  describe('comBusca', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('não deve alterar filtros quando busca está vazia', async () => {
      const builder = new PatrimonioFilterBuilder();
      await builder.comBusca('');
      expect(builder.build()).toEqual({});
    });

    it('deve montar $or casando número de patrimônio OU item cujo nome bate', async () => {
      const itemId = new mongoose.Types.ObjectId();
      jest.spyOn(ItemModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: itemId }]),
      });

      const builder = new PatrimonioFilterBuilder();
      await builder.comBusca('NB-002');
      const filtros = builder.build();

      expect(ItemModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: { $regex: 'NB\\-002', $options: 'i' },
          tipo: 'permanente',
        }),
      );
      expect(filtros['$or']).toEqual([
        { numero_patrimonio: { $regex: 'NB\\-002', $options: 'i' } },
        { item: { $in: [itemId] } },
      ]);
    });
  });

  describe('comCategoria', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('não deve alterar filtros quando categoria está vazia', async () => {
      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('');
      expect(builder.build()).toEqual({});
    });

    it('deve filtrar por ID de categoria válido, resolvendo os itens dela', async () => {
      const categoriaId = new mongoose.Types.ObjectId().toString();
      const itemId = new mongoose.Types.ObjectId();
      jest
        .spyOn(CategoriaModel, 'findById')
        .mockResolvedValue({ _id: categoriaId });
      jest.spyOn(ItemModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: itemId }]),
      });

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria(categoriaId);

      expect(builder.build()).toEqual({ item: { $in: [itemId] } });
    });

    it('deve filtrar por nome de categoria', async () => {
      const itemId = new mongoose.Types.ObjectId();
      jest
        .spyOn(CategoriaModel, 'findOne')
        .mockResolvedValue({ _id: 'cat1' });
      jest.spyOn(ItemModel, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([{ _id: itemId }]),
      });

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('Rede');

      expect(CategoriaModel.findOne).toHaveBeenCalledWith({
        nome: { $regex: 'Rede', $options: 'i' },
      });
      expect(builder.build()).toEqual({ item: { $in: [itemId] } });
    });

    it('deve devolver $in vazio quando a categoria não existe (não a coleção toda)', async () => {
      jest.spyOn(CategoriaModel, 'findOne').mockResolvedValue(null);

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('Inexistente');

      expect(builder.build()).toEqual({ item: { $in: [] } });
    });
  });

  it('comAtivo deve mapear "true"/"false" para booleano', () => {
    expect(new PatrimonioFilterBuilder().comAtivo('true').build()).toEqual({
      ativo: true,
    });
    expect(new PatrimonioFilterBuilder().comAtivo('false').build()).toEqual({
      ativo: false,
    });
  });

  it('deve encadear múltiplos filtros', () => {
    const itemId = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder()
      .comItem(itemId)
      .comStatus('Manutenção')
      .comAtivo('true')
      .build();
    expect(filtros['status']).toBe('Manutenção');
    expect(filtros['ativo']).toBe(true);
    expect(filtros['item']).toBeDefined();
  });
});
