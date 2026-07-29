import MovimentacaoFilterBuilder from '../MovimentacaoFilterBuilder.js';
import mongoose from 'mongoose';

jest.mock('../../item/ItemModel.js', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../../fornecedor/FornecedorModel.js', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const Item = require('../../item/ItemModel.js');
const Fornecedor = require('../../fornecedor/FornecedorModel.js');

describe('MovimentacaoFilterBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve criar filtro vazio por padrão', () => {
    const builder = new MovimentacaoFilterBuilder();
    expect(builder.build()).toEqual({});
  });

  it('deve adicionar filtro de tipo corretamente', () => {
    const builder = new MovimentacaoFilterBuilder().comTipo('entrada');
    expect(builder.build()).toEqual({
      tipo: { $regex: 'entrada', $options: 'i' },
    });
  });

  it('deve adicionar filtro de data corretamente', () => {
    const builder = new MovimentacaoFilterBuilder().comData('2024-05-29');
    const filtros = builder.build();
    expect(filtros.data_hora).toBeDefined();
    expect(filtros.data_hora.$gte).toBeInstanceOf(Date);
    expect(filtros.data_hora.$lte).toBeInstanceOf(Date);
  });

  it('deve adicionar filtro de quantidade corretamente', () => {
    const builder = new MovimentacaoFilterBuilder().comQuantidade('10');
    expect(builder.build()).toEqual({ quantidade: 10 });
  });

  it('não deve adicionar filtro de quantidade se valor for inválido', () => {
    const builder = new MovimentacaoFilterBuilder().comQuantidade('abc');
    expect(builder.build()).toEqual({});
  });

  it('não deve adicionar filtro de tipo/data/quantidade se valores forem vazios', () => {
    const builder = new MovimentacaoFilterBuilder()
      .comTipo('')
      .comData('')
      .comQuantidade('');
    expect(builder.build()).toEqual({});
  });

  describe('comItem', () => {
    it('deve adicionar filtro de item por ObjectId válido e encontrado', async () => {
      const builder = new MovimentacaoFilterBuilder();
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      Item.findById.mockResolvedValue({ _id: 'c1' });
      await builder.comItem('c1');
      expect(builder.build()).toEqual({ item: 'c1' });
    });
    it('deve adicionar filtro de item por ObjectId válido e não encontrado', async () => {
      const builder = new MovimentacaoFilterBuilder();
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
      Item.findById.mockResolvedValue(null);
      await builder.comItem('c1');
      expect(builder.build()).toEqual({ item: { $in: [] } });
    });
    it('deve adicionar filtro de item por string encontrada', async () => {
      const builder = new MovimentacaoFilterBuilder();
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
      Item.findOne.mockResolvedValue({ _id: 'c2' });
      await builder.comItem('resistor');
      expect(builder.build()).toEqual({ item: 'c2' });
    });
    it('deve adicionar filtro de item por string não encontrada', async () => {
      const builder = new MovimentacaoFilterBuilder();
      jest.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
      Item.findOne.mockResolvedValue(null);
      await builder.comItem('capacitor');
      expect(builder.build()).toEqual({ item: { $in: [] } });
    });
    it('não deve adicionar filtro se valor for vazio', async () => {
      const builder = new MovimentacaoFilterBuilder();
      await builder.comItem('');
      expect(builder.build()).toEqual({});
    });
  });
});
