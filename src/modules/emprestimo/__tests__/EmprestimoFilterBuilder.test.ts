import EmprestimoFilterBuilder from '../EmprestimoFilterBuilder.js';
import mongoose from 'mongoose';

jest.mock('../../item/ItemModel.js', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../../localizacao/LocalizacaoModel.js', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
}));

const Item = require('../../item/ItemModel.js');
const Localizacao = require('../../localizacao/LocalizacaoModel.js');

describe('EmprestimoFilterBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não deve adicionar filtro de item quando ausente', async () => {
    const builder = new EmprestimoFilterBuilder();
    await builder.comItem(null);
    expect(builder.build()).toEqual({});
  });

  it('deve filtrar por id de item válido e existente', async () => {
    const itemId = new mongoose.Types.ObjectId().toString();
    Item.findById.mockResolvedValue({ _id: itemId });

    const builder = new EmprestimoFilterBuilder();
    await builder.comItem(itemId);

    expect(builder.build().item).toBe(itemId);
  });

  it('deve retornar filtro vazio quando id de item não existe', async () => {
    const itemId = new mongoose.Types.ObjectId().toString();
    Item.findById.mockResolvedValue(null);

    const builder = new EmprestimoFilterBuilder();
    await builder.comItem(itemId);

    expect(builder.build().item).toEqual({ $in: [] });
  });

  it('deve buscar item por nome quando não é ObjectId', async () => {
    const itemId = new mongoose.Types.ObjectId();
    Item.findOne.mockResolvedValue({ _id: itemId });

    const builder = new EmprestimoFilterBuilder();
    await builder.comItem('Resistor');

    expect(builder.build().item).toBe(itemId);
  });

  it('deve filtrar por localizacao válida e existente', async () => {
    const localizacaoId = new mongoose.Types.ObjectId().toString();
    Localizacao.findById.mockResolvedValue({ _id: localizacaoId });

    const builder = new EmprestimoFilterBuilder();
    await builder.comLocalizacao(localizacaoId);

    expect(builder.build().localizacao).toBe(localizacaoId);
  });

  it('deve montar busca combinando solicitante, item e localizacao', async () => {
    Item.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    Localizacao.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    const builder = new EmprestimoFilterBuilder();
    await builder.comBusca('fulano');

    expect(builder.build()['$or']).toHaveLength(3);
  });

  it('deve filtrar por tipo_controle válido', () => {
    const builder = new EmprestimoFilterBuilder();
    builder.comTipoControle('unidade');
    expect(builder.build().tipo_controle).toBe('unidade');
  });

  it('deve ignorar tipo_controle inválido', () => {
    const builder = new EmprestimoFilterBuilder();
    builder.comTipoControle('invalido');
    expect(builder.build().tipo_controle).toBeUndefined();
  });

  it('deve filtrar apenas empréstimos abertos', () => {
    const builder = new EmprestimoFilterBuilder();
    builder.comApenasAbertos(true);
    expect(builder.build().quantidade_aberta).toEqual({ $gt: 0 });
  });

  it('deve filtrar empréstimos atrasados', () => {
    const builder = new EmprestimoFilterBuilder();
    builder.comAtrasados(true);
    const filtros = builder.build();
    expect(filtros.quantidade_aberta).toEqual({ $gt: 0 });
    expect(filtros.data_prevista_devolucao).toHaveProperty('$lt');
  });

  it('deve combinar data_saida_inicio e data_saida_fim no mesmo campo', () => {
    const inicio = new Date('2026-01-01');
    const fim = new Date('2026-06-01');
    const builder = new EmprestimoFilterBuilder();
    builder.comDataSaidaInicio(inicio);
    builder.comDataSaidaFim(fim);

    expect(builder.build().data_saida).toEqual({ $gte: inicio, $lte: fim });
  });
});
