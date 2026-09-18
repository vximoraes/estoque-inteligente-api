import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Estoque from '../EstoqueModel.js';
import Item from '../../item/ItemModel.js';
import Categoria from '../../categoria/CategoriaModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
import Notificacao from '../../notificacao/NotificacaoModel.js';

let mongoServer;
const usuarioId = new mongoose.Types.ObjectId().toString();

async function criarItemComEstoqueMinimo(estoqueMinimo) {
  const categoria = await Categoria.create({
    nome: `Categoria ${Date.now()}-${Math.random()}`,
    tipo: 'consumo',
    usuario: usuarioId,
  });
  return Item.create({
    nome: `Item ${Date.now()}-${Math.random()}`,
    categoria: categoria._id,
    estoque_minimo: estoqueMinimo,
    usuario: usuarioId,
  });
}

async function criarLocalizacao() {
  return Localizacao.create({
    nome: `Localizacao ${Date.now()}-${Math.random()}`,
    usuario: usuarioId,
  });
}

describe('Modelo de Estoque', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Estoque.deleteMany({});
    await Item.deleteMany({});
    await Categoria.deleteMany({});
    await Localizacao.deleteMany({});
    await Notificacao.deleteMany({});
  });

  it('deve criar estoque válido com quantidade padrão zero', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    const localizacao = await criarLocalizacao();

    const estoque = await Estoque.create({
      item: item._id,
      localizacao: localizacao._id,
      usuario: usuarioId,
    });

    expect(estoque._id).toBeDefined();
    expect(estoque.quantidade).toBe(0);
  });

  it('não deve criar estoque sem item', async () => {
    const localizacao = await criarLocalizacao();
    await expect(
      Estoque.create({ localizacao: localizacao._id, usuario: usuarioId }),
    ).rejects.toThrow();
  });

  it('não deve criar estoque sem localizacao', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    await expect(
      Estoque.create({ item: item._id, usuario: usuarioId }),
    ).rejects.toThrow();
  });

  it('não deve permitir quantidade negativa', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    const localizacao = await criarLocalizacao();
    await expect(
      Estoque.create({
        item: item._id,
        localizacao: localizacao._id,
        quantidade: -1,
        usuario: usuarioId,
      }),
    ).rejects.toThrow();
  });

  it('não deve permitir item e localizacao duplicados', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    const localizacao = await criarLocalizacao();
    await Estoque.create({
      item: item._id,
      localizacao: localizacao._id,
      usuario: usuarioId,
    });

    await expect(
      Estoque.create({
        item: item._id,
        localizacao: localizacao._id,
        usuario: usuarioId,
      }),
    ).rejects.toThrow();
  });

  it('deve somar a quantidade de múltiplos estoques no item ao salvar', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    const localizacao1 = await criarLocalizacao();
    const localizacao2 = await criarLocalizacao();

    await Estoque.create({
      item: item._id,
      localizacao: localizacao1._id,
      quantidade: 10,
      usuario: usuarioId,
    });
    await Estoque.create({
      item: item._id,
      localizacao: localizacao2._id,
      quantidade: 5,
      usuario: usuarioId,
    });

    const itemAtualizado = await Item.findById(item._id);
    expect(itemAtualizado.quantidade).toBe(15);
    expect(itemAtualizado.quantidade_disponivel).toBe(15);
  });

  it('deve notificar quando o item fica indisponível (quantidade chega a zero)', async () => {
    const item = await criarItemComEstoqueMinimo(5);
    const localizacao = await criarLocalizacao();

    const estoque = await Estoque.create({
      item: item._id,
      localizacao: localizacao._id,
      quantidade: 3,
      usuario: usuarioId,
    });

    await Estoque.findOneAndUpdate({ _id: estoque._id }, { quantidade: 0 });

    const notificacoes = await Notificacao.find({ usuario: usuarioId });
    expect(notificacoes.some((n) => n.mensagem.includes('indisponível'))).toBe(
      true,
    );
  });

  it('deve notificar quando o item entra em estoque baixo', async () => {
    const item = await criarItemComEstoqueMinimo(10);
    const localizacao = await criarLocalizacao();

    await Estoque.create({
      item: item._id,
      localizacao: localizacao._id,
      quantidade: 3,
      usuario: usuarioId,
    });

    const notificacoes = await Notificacao.find({ usuario: usuarioId });
    expect(notificacoes.some((n) => n.mensagem.includes('estoque baixo'))).toBe(
      true,
    );
  });
});
