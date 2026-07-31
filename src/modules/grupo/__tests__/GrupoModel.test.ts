import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Grupo from '../GrupoModel.js';

let mongoServer;

const permissao = (overrides = {}) => ({
  rota: 'itens',
  dominio: 'localhost',
  ativo: true,
  buscar: true,
  enviar: false,
  substituir: false,
  modificar: false,
  excluir: false,
  ...overrides,
});

describe('Modelo de Grupo', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Grupo.deleteMany({});
  });

  it('deve criar um grupo com defaults corretos', async () => {
    const grupo = await Grupo.create({
      nome: 'Operadores',
      descricao: 'Grupo operacional',
    });
    expect(grupo._id).toBeDefined();
    expect(grupo.ativo).toBe(true);
    expect(grupo.permissoes).toEqual([]);
  });

  it('não deve criar grupo com nome duplicado', async () => {
    await Grupo.create({ nome: 'Administradores', descricao: 'Admin' });
    await expect(
      Grupo.create({ nome: 'Administradores', descricao: 'Outro' }),
    ).rejects.toThrow();
  });

  it('deve aceitar permissoes com rota+dominio unicos', async () => {
    const grupo = await Grupo.create({
      nome: 'Operadores',
      descricao: 'Grupo operacional',
      permissoes: [
        permissao({ rota: 'itens' }),
        permissao({ rota: 'categorias' }),
      ],
    });
    expect(grupo.permissoes).toHaveLength(2);
  });

  it('não deve aceitar permissoes duplicadas (mesma rota+dominio)', async () => {
    const grupo = new Grupo({
      nome: 'Operadores',
      descricao: 'Grupo operacional',
      permissoes: [permissao({ rota: 'itens' }), permissao({ rota: 'itens' })],
    });
    await expect(grupo.save()).rejects.toThrow(/Permissoes duplicadas/);
  });
});
