import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Rota from '../RotaModel.js';

let mongoServer;

describe('Modelo de Rota', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await Rota.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Rota.deleteMany({});
  });

  it('deve criar uma rota com os defaults corretos', async () => {
    const rota = await Rota.create({ rota: 'itens' });
    expect(rota._id).toBeDefined();
    expect(rota.ativo).toBe(false);
    expect(rota.buscar).toBe(false);
    expect(rota.enviar).toBe(false);
    expect(rota.substituir).toBe(false);
    expect(rota.modificar).toBe(false);
    expect(rota.excluir).toBe(false);
  });

  it('deve normalizar rota para minusculo antes de salvar', async () => {
    const rota = await Rota.create({ rota: 'ITENS' });
    expect(rota.rota).toBe('itens');
  });

  it('não deve permitir rota duplicada', async () => {
    await Rota.create({ rota: 'itens' });
    await expect(Rota.create({ rota: 'itens' })).rejects.toThrow();
  });
});
