import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buscarEmprestimos } from '../buscarEmprestimos.js';
import ItemModel from '../../../../modules/item/ItemModel.js';
import CategoriaModel from '../../../../modules/categoria/CategoriaModel.js';
import LocalizacaoModel from '../../../../modules/localizacao/LocalizacaoModel.js';
import PatrimonioModel from '../../../../modules/patrimonio/PatrimonioModel.js';
import EmprestimoModel from '../../../../modules/emprestimo/EmprestimoModel.js';
import UsuarioModel from '../../../../modules/usuario/UsuarioModel.js';

let mongoServer: MongoMemoryServer;
const usuarioId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    ItemModel.deleteMany({}),
    CategoriaModel.deleteMany({}),
    LocalizacaoModel.deleteMany({}),
    PatrimonioModel.deleteMany({}),
    EmprestimoModel.deleteMany({}),
  ]);
});

function criarLocalizacao() {
  return LocalizacaoModel.create({ nome: 'Laboratório 1', usuario: usuarioId });
}

async function criarItem(localizacao: mongoose.Types.ObjectId) {
  const categoria = await CategoriaModel.create({
    nome: 'Periféricos',
    tipo: 'consumo',
    usuario: usuarioId,
  });
  return ItemModel.create({
    nome: 'Mouse Logitech MX Master',
    categoria: categoria._id,
    usuario: usuarioId,
    quantidade: 10,
    quantidade_disponivel: 10,
  });
}

async function criarPatrimonio(localizacao: mongoose.Types.ObjectId) {
  const categoria = await CategoriaModel.create({
    nome: 'Notebooks',
    tipo: 'permanente',
    usuario: usuarioId,
  });
  return PatrimonioModel.create({
    numero_patrimonio: 'PAT-001',
    modelo: 'ThinkPad T14',
    categoria: categoria._id,
    localizacao,
    status: 'Emprestado',
    usuario: usuarioId,
  });
}

describe('buscarEmprestimos', () => {
  it('resolve o campo item para o número de patrimônio em empréstimo de unidade', async () => {
    const localizacao = await criarLocalizacao();
    const patrimonio = await criarPatrimonio(localizacao._id);

    await EmprestimoModel.create({
      tipo_controle: 'unidade',
      patrimonio: patrimonio._id,
      localizacao: localizacao._id,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: 'Fulano de Tal',
      usuario_responsavel: usuarioId,
      data_prevista_devolucao: new Date(Date.now() + 86400000),
    });

    const resultado = await buscarEmprestimos({}, usuarioId);

    expect(resultado.registros).toHaveLength(1);
    expect(resultado.registros[0]?.item).toBe(
      'ThinkPad T14 (patrimônio PAT-001)',
    );
    expect(resultado.registros[0]?.tipo_controle).toBe('unidade');
    expect(resultado.registros[0]?.item).not.toBe(null);
  });

  it('mascara o e-mail numa lista com vários solicitantes e mostra completo ao filtrar por um', async () => {
    const localizacao = await criarLocalizacao();
    const patrimonio = await criarPatrimonio(localizacao._id);
    const base = {
      tipo_controle: 'unidade',
      patrimonio: patrimonio._id,
      localizacao: localizacao._id,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      usuario_responsavel: usuarioId,
    };
    await EmprestimoModel.create([
      {
        ...base,
        solicitante_nome: 'Joana Lima',
        solicitante_email: 'joana@escola.edu',
      },
      {
        ...base,
        solicitante_nome: 'Pedro Alves',
        solicitante_email: 'pedro@escola.edu',
      },
    ]);

    const todos = await buscarEmprestimos({}, usuarioId);
    expect(todos.registros.map((r) => r.solicitante_email).sort()).toEqual([
      'jo***@escola.edu',
      'pe***@escola.edu',
    ]);

    const umSo = await buscarEmprestimos(
      { solicitanteNome: 'Joana' },
      usuarioId,
    );
    expect(umSo.registros[0]?.solicitante_email).toBe('joana@escola.edu');
  });

  it('expõe datas, observações, contato do solicitante e quem registrou', async () => {
    const usuario = await UsuarioModel.create({
      nome: 'Responsável Teste',
      email: 'responsavel-emprestimo@teste.com',
    });
    const localizacao = await criarLocalizacao();
    const patrimonio = await criarPatrimonio(localizacao._id);
    const dataSaida = new Date('2026-10-01T10:00:00Z');

    await EmprestimoModel.create({
      tipo_controle: 'unidade',
      patrimonio: patrimonio._id,
      localizacao: localizacao._id,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: 'Fulano de Tal',
      solicitante_email: 'fulano@teste.com',
      data_saida: dataSaida,
      observacoes_emprestimo: 'Levar para a aula de redes',
      usuario_responsavel: usuario._id.toString(),
    });

    const { registros } = await buscarEmprestimos({}, usuarioId);

    expect(registros[0]).toMatchObject({
      solicitante_email: 'fulano@teste.com',
      data_saida: dataSaida,
      observacoes_emprestimo: 'Levar para a aula de redes',
      observacoes_devolucao: null,
      data_devolucao_total: null,
      registrado_por: 'Responsável Teste',
    });
    await UsuarioModel.deleteMany({});
  });

  it('resolve o campo item para o nome do item em empréstimo de quantidade', async () => {
    const localizacao = await criarLocalizacao();
    const item = await criarItem(localizacao._id);

    await EmprestimoModel.create({
      tipo_controle: 'quantidade',
      item: item._id,
      localizacao: localizacao._id,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: 'Ciclana',
      usuario_responsavel: usuarioId,
    });

    const resultado = await buscarEmprestimos({}, usuarioId);

    expect(resultado.registros).toHaveLength(1);
    expect(resultado.registros[0]?.item).toBe('Mouse Logitech MX Master');
    expect(resultado.registros[0]?.tipo_controle).toBe('quantidade');
  });

  it('traz empréstimo atrasado antigo mesmo fora da janela dos mais recentes', async () => {
    const localizacao = await criarLocalizacao();
    const patrimonio = await criarPatrimonio(localizacao._id);

    await EmprestimoModel.create({
      tipo_controle: 'unidade',
      patrimonio: patrimonio._id,
      localizacao: localizacao._id,
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: 'Empréstimo Antigo Atrasado',
      usuario_responsavel: usuarioId,
      data_prevista_devolucao: new Date('2020-01-01'),
      createdAt: new Date('2020-01-01'),
    });

    for (let i = 0; i < 60; i++) {
      const item = await ItemModel.create({
        nome: `Item recente ${i}`,
        categoria: (
          await CategoriaModel.create({
            nome: `Categoria ${i}`,
            tipo: 'consumo',
            usuario: usuarioId,
          })
        )._id,
        usuario: usuarioId,
      });
      await EmprestimoModel.create({
        tipo_controle: 'quantidade',
        item: item._id,
        localizacao: localizacao._id,
        quantidade_emprestada: 1,
        quantidade_devolvida: 0,
        quantidade_aberta: 1,
        solicitante_nome: `Solicitante recente ${i}`,
        usuario_responsavel: usuarioId,
      });
    }

    const resultado = await buscarEmprestimos(
      { status: 'Atrasado', limite: 50 },
      usuarioId,
    );

    expect(
      resultado.registros.some(
        (e) => e.solicitante === 'Empréstimo Antigo Atrasado',
      ),
    ).toBe(true);
  });
});
