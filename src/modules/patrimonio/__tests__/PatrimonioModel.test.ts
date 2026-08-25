import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Patrimonio from '../PatrimonioModel.js';
import Item from '../../item/ItemModel.js';
import Categoria from '../../categoria/CategoriaModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
// `atualizarContadoresItem` resolve 'notificacoes' via mongoose.model() em
// runtime — precisa estar registrado antes de qualquer save/update.
import '../../notificacao/NotificacaoModel.js';

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
  await Item.deleteMany({});
  await Categoria.deleteMany({});
  await Localizacao.deleteMany({});
});

async function criarItemPermanente(overrides = {}) {
  const categoria = await Categoria.create({
    nome: 'Informática',
    tipo: 'permanente',
    usuario: new mongoose.Types.ObjectId().toString(),
  });
  return Item.create({
    nome: 'Notebook Dell',
    tipo: 'permanente',
    categoria: categoria._id,
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
    const item = await criarItemPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      item: item._id,
      numero_patrimonio: 'nb-0001',
      localizacao: localizacao._id,
      usuario,
    });

    expect(patrimonio.status).toBe('Disponível');
    expect(patrimonio.ativo).toBe(true);
    // uppercase:true no schema
    expect(patrimonio.numero_patrimonio).toBe('NB-0001');
  });

  it('deve persistir campos_personalizados preservando a ordem', async () => {
    const item = await criarItemPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      item: item._id,
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
    const item = await criarItemPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const patrimonio = await Patrimonio.create({
      item: item._id,
      numero_patrimonio: 'NB-0004',
      localizacao: localizacao._id,
      usuario,
    });

    expect(patrimonio.campos_personalizados).toEqual([]);
  });

  it('não deve permitir dois patrimônios ativos com o mesmo número', async () => {
    const item = await criarItemPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    await Patrimonio.create({
      item: item._id,
      numero_patrimonio: 'NB-0001',
      localizacao: localizacao._id,
      usuario,
    });

    await expect(
      Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0001',
        localizacao: localizacao._id,
        usuario,
      }),
    ).rejects.toThrow();
  });

  it('deve permitir reaproveitar o número de um patrimônio inativado', async () => {
    const item = await criarItemPermanente();
    const localizacao = await criarLocalizacao();
    const usuario = new mongoose.Types.ObjectId().toString();

    const original = await Patrimonio.create({
      item: item._id,
      numero_patrimonio: 'NB-0002',
      localizacao: localizacao._id,
      usuario,
    });
    original.ativo = false;
    await original.save();

    await expect(
      Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0002',
        localizacao: localizacao._id,
        usuario,
      }),
    ).resolves.toBeDefined();
  });

  describe('atualizarContadoresItem', () => {
    it('deve recalcular quantidade e quantidade_disponivel do Item ao criar unidades', async () => {
      const item = await criarItemPermanente();
      const localizacao = await criarLocalizacao();
      const usuario = new mongoose.Types.ObjectId().toString();

      await Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0010',
        localizacao: localizacao._id,
        usuario,
      });
      await Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0011',
        localizacao: localizacao._id,
        usuario,
      });

      const itemAtualizado = await Item.findById(item._id);
      expect(itemAtualizado.quantidade).toBe(2);
      expect(itemAtualizado.quantidade_disponivel).toBe(2);
    });

    it('deve refletir mudança de status na quantidade_disponivel, mas não em quantidade (exceto Baixado)', async () => {
      const item = await criarItemPermanente();
      const localizacao = await criarLocalizacao();
      const usuario = new mongoose.Types.ObjectId().toString();

      const unidade = await Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0020',
        localizacao: localizacao._id,
        usuario,
      });
      await Patrimonio.create({
        item: item._id,
        numero_patrimonio: 'NB-0021',
        localizacao: localizacao._id,
        usuario,
      });

      await Patrimonio.findOneAndUpdate(
        { _id: unidade._id },
        { status: 'Manutenção' },
      );

      let itemAtualizado = await Item.findById(item._id);
      expect(itemAtualizado.quantidade).toBe(2);
      expect(itemAtualizado.quantidade_disponivel).toBe(1);

      await Patrimonio.findOneAndUpdate(
        { _id: unidade._id },
        { status: 'Baixado' },
      );

      itemAtualizado = await Item.findById(item._id);
      expect(itemAtualizado.quantidade).toBe(1);
      expect(itemAtualizado.quantidade_disponivel).toBe(1);
    });
  });
});
