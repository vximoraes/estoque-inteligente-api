import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Emprestimo from '../EmprestimoModel.js';

let mongoServer;
const localizacao = new mongoose.Types.ObjectId();
const item = new mongoose.Types.ObjectId();
const patrimonio = new mongoose.Types.ObjectId();
const usuarioId = new mongoose.Types.ObjectId().toString();

describe('Modelo de Emprestimo', () => {
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
  });

  it('deve criar empréstimo por quantidade válido', async () => {
    const emprestimo = await Emprestimo.create({
      item,
      localizacao,
      tipo_controle: 'quantidade',
      quantidade_emprestada: 5,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
    });

    expect(emprestimo._id).toBeDefined();
    expect(emprestimo.quantidade_aberta).toBe(5);
  });

  it('deve calcular quantidade_aberta automaticamente quando ausente', async () => {
    const emprestimo = await Emprestimo.create({
      item,
      localizacao,
      quantidade_emprestada: 10,
      quantidade_devolvida: 4,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
    });

    expect(emprestimo.quantidade_aberta).toBe(6);
  });

  it('não deve permitir quantidade_aberta negativa', async () => {
    const emprestimo = await Emprestimo.create({
      item,
      localizacao,
      quantidade_emprestada: 5,
      quantidade_devolvida: 10,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
    });

    expect(emprestimo.quantidade_aberta).toBe(0);
  });

  it('não deve criar empréstimo por quantidade sem item', async () => {
    await expect(
      Emprestimo.create({
        localizacao,
        tipo_controle: 'quantidade',
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano',
        usuario_responsavel: usuarioId,
      }),
    ).rejects.toThrow();
  });

  it('deve criar empréstimo de unidade patrimonial sem item', async () => {
    const emprestimo = await Emprestimo.create({
      patrimonio,
      localizacao,
      tipo_controle: 'unidade',
      quantidade_emprestada: 1,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
    });

    expect(emprestimo.item).toBeNull();
    expect(emprestimo.patrimonio.toString()).toBe(patrimonio.toString());
  });

  it('não deve criar empréstimo sem localizacao', async () => {
    await expect(
      Emprestimo.create({
        item,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano',
        usuario_responsavel: usuarioId,
      }),
    ).rejects.toThrow();
  });

  it('não deve permitir quantidade_emprestada menor que 1', async () => {
    await expect(
      Emprestimo.create({
        item,
        localizacao,
        quantidade_emprestada: 0,
        solicitante_nome: 'Fulano',
        usuario_responsavel: usuarioId,
      }),
    ).rejects.toThrow();
  });

  it('deve aplicar valores padrão de ativo e email_atraso_enviado', async () => {
    const emprestimo = await Emprestimo.create({
      item,
      localizacao,
      quantidade_emprestada: 5,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
    });

    expect(emprestimo.ativo).toBe(true);
    expect(emprestimo.email_atraso_enviado).toBe(false);
  });
});
