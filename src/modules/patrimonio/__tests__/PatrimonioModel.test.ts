import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Patrimonio from '../PatrimonioModel.js';
import Categoria from '../../categoria/CategoriaModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Garante que o índice único parcial de numero_patrimonio já foi
  // construído antes dos testes de duplicidade rodarem (autoIndex é
  // assíncrono por padrão).
  await Patrimonio.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await Patrimonio.deleteMany({});
  await Categoria.deleteMany({});
  await Localizacao.deleteMany({});
});

async function criarCategoriaPermanente(overrides = {}) {
  return Categoria.create({
    nome: 'Informática',
    tipo: 'permanente',
    usuario: new mongoose.Types.ObjectId().toString(),
    ...overrides,
  });
}

async function criarLocalizacao() {
  return Localizacao.create({
    nome: 'Sala 1',
    usuario: new mongoose.Types.ObjectId(),
  });
}

describe('Modelo de Patrimonio', () => {
  it('deve criar uma unidade com dados válidos e status padrão Disponível', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'nb-0001',
      localizacao: localizacao._id,
      usuario,
    });

    expect(patrimonio.status).toBe('Disponível');
    expect(patrimonio.ativo).toBe(true);
    // uppercase:true no schema
    expect(patrimonio.numero_patrimonio).toBe('NB-0001');
  });

  it('deve persistir modelo e fabricante quando informados', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'NB-0002',
      modelo: 'ThinkPad T14',
      fabricante: 'Lenovo',
      localizacao: localizacao._id,
      usuario,
    });

    expect(patrimonio.modelo).toBe('ThinkPad T14');
    expect(patrimonio.fabricante).toBe('Lenovo');
  });

  it('deve rejeitar criação sem categoria', async () => {
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    await expect(
      Patrimonio.create({
        numero_patrimonio: 'NB-0009',
        localizacao: localizacao._id,
        usuario,
      }),
    ).rejects.toThrow();
  });

  it('deve persistir campos_personalizados preservando a ordem', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'NB-0003',
      localizacao: localizacao._id,
      usuario,
      campos_personalizados: [
        { chave: 'Memória RAM', valor: '16GB' },
        { chave: 'Número de série', valor: 'SN12345' },
      ],
    });

    expect(patrimonio.campos_personalizados.map((c) => c.chave)).toEqual([
      'Memória RAM',
      'Número de série',
    ]);
  });

  it('deve assumir lista vazia quando campos_personalizados não é informado', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'NB-0004',
      localizacao: localizacao._id,
      usuario,
    });

    expect(patrimonio.campos_personalizados).toEqual([]);
  });

  it('não deve permitir dois patrimônios ativos com o mesmo número', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'NB-0001',
      localizacao: localizacao._id,
      usuario,
    });

    await expect(
      Patrimonio.create({
        categoria: categoria._id,
        numero_patrimonio: 'NB-0001',
        localizacao: localizacao._id,
        usuario,
      }),
    ).rejects.toThrow();
  });

  it('deve permitir reaproveitar o número de um patrimônio inativado', async () => {
    const categoria = await criarCategoriaPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const original = await Patrimonio.create({
      categoria: categoria._id,
      numero_patrimonio: 'NB-0002',
      localizacao: localizacao._id,
      usuario,
    });
    original.ativo = false;
    await original.save();

    await expect(
      Patrimonio.create({
        categoria: categoria._id,
        numero_patrimonio: 'NB-0002',
        localizacao: localizacao._id,
        usuario,
      }),
    ).resolves.toBeDefined();
  });
});
