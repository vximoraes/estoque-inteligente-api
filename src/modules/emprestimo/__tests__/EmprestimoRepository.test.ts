import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import EmprestimoRepository from '../EmprestimoRepository.js';
import Emprestimo from '../EmprestimoModel.js';
import Item from '../../item/ItemModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
import '../../usuario/UsuarioModel.js';
import '../../patrimonio/PatrimonioModel.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Emprestimo.deleteMany({});
  await Item.deleteMany({});
  await Localizacao.deleteMany({});
});

const DIA = 24 * 60 * 60 * 1000;

describe('EmprestimoRepository', () => {
  let repository;
  let dados;

  beforeEach(async () => {
    repository = new EmprestimoRepository();
    const usuario = new mongoose.Types.ObjectId();
    const localizacao = await Localizacao.create({
      nome: 'Sala 1',
      usuario,
    });
    const item = await Item.create({
      nome: 'Cabo HDMI',
      categoria: new mongoose.Types.ObjectId(),
      estoque_minimo: 1,
      usuario,
    });
    dados = {
      item: item._id,
      localizacao: localizacao._id,
      tipo_controle: 'quantidade',
      quantidade_emprestada: 2,
      quantidade_devolvida: 0,
      quantidade_aberta: 2,
      solicitante_nome: 'Fulano',
      usuario_responsavel: String(usuario),
    };
  });

  describe('calcularStatus', () => {
    it.each([
      [{ quantidade_aberta: 0 }, 'Devolvido'],
      [{ quantidade_aberta: 1, data_prevista_devolucao: null }, 'Ativo'],
      [
        {
          quantidade_aberta: 1,
          data_prevista_devolucao: new Date(Date.now() - DIA),
        },
        'Atrasado',
      ],
      [
        {
          quantidade_aberta: 1,
          data_prevista_devolucao: new Date(Date.now() + DIA),
        },
        'Ativo',
      ],
      [null, 'Ativo'],
    ])('%o vira %s', (emprestimo, esperado) => {
      expect(repository.calcularStatus(emprestimo)).toBe(esperado);
    });
  });

  it('cria e devolve o empréstimo populado com status', async () => {
    const criado = await repository.criar(dados);
    expect(criado.item.nome).toBe('Cabo HDMI');
    expect(criado.localizacao.nome).toBe('Sala 1');
    expect(criado.status).toBe('Ativo');
  });

  it('busca por id só entre os ativos', async () => {
    const criado = await Emprestimo.create(dados);
    const encontrado = await repository.listar({
      params: { id: String(criado._id) },
    });
    expect(encontrado.status).toBe('Ativo');

    await Emprestimo.updateOne({ _id: criado._id }, { ativo: false });
    await expect(
      repository.listar({ params: { id: String(criado._id) } }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      repository.buscarPorId(String(criado._id)),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lista paginado, filtra por status e devolve o status calculado', async () => {
    await Emprestimo.create([
      dados,
      {
        ...dados,
        solicitante_nome: 'Beltrano',
        quantidade_devolvida: 2,
        quantidade_aberta: 0,
      },
      {
        ...dados,
        solicitante_nome: 'Ciclano',
        data_prevista_devolucao: new Date(Date.now() - DIA),
      },
    ]);

    const todos = await repository.listar({ params: {}, query: {} });
    expect(todos.totalDocs).toBe(3);

    const atrasados = await repository.listar({
      params: {},
      query: { status: 'atrasado' },
    });
    expect(atrasados.docs.map((d) => [d.solicitante_nome, d.status])).toEqual([
      ['Ciclano', 'Atrasado'],
    ]);

    const devolvidos = await repository.listar({
      params: {},
      query: { status: 'devolvido', busca: 'beltr' },
    });
    expect(devolvidos.docs.map((d) => d.status)).toEqual(['Devolvido']);
  });

  it('atualizarSe só grava quando a condição ainda vale', async () => {
    const criado = await Emprestimo.create(dados);
    const condicao = { quantidade_aberta: { $gte: 2 } };
    const reserva = {
      $inc: { quantidade_aberta: -2, quantidade_devolvida: 2 },
    };

    expect(
      await repository.atualizarSe(String(criado._id), condicao, reserva),
    ).toBe(true);
    expect(
      await repository.atualizarSe(String(criado._id), condicao, reserva),
    ).toBe(false);
    expect((await Emprestimo.findById(criado._id)).quantidade_aberta).toBe(0);
  });

  it('atualiza a devolução e os dados do empréstimo', async () => {
    const criado = await Emprestimo.create(dados);

    const devolvido = await repository.atualizarDevolucao(String(criado._id), {
      quantidade_aberta: 0,
      quantidade_devolvida: 2,
      data_devolucao_total: new Date(),
    });
    expect(devolvido.status).toBe('Devolvido');

    const editado = await repository.atualizar(String(criado._id), {
      solicitante_email: 'fulano@teste.com',
    });
    expect(editado.solicitante_email).toBe('fulano@teste.com');
  });

  it('exclui de forma lógica e responde 404 para inexistente', async () => {
    const criado = await Emprestimo.create(dados);
    const inexistente = String(new mongoose.Types.ObjectId());

    await repository.excluir(String(criado._id));
    expect((await Emprestimo.findById(criado._id)).ativo).toBe(false);

    for (const operacao of [
      () => repository.excluir(inexistente),
      () => repository.atualizar(inexistente, {}),
      () => repository.atualizarDevolucao(inexistente, {}),
    ]) {
      await expect(operacao()).rejects.toMatchObject({ statusCode: 404 });
    }
  });
});
