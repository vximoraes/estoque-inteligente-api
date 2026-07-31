import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Rota from '../RotaModel.js';

let mongoServer;

describe('Modelo de Rota', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Rota.deleteMany({});
  });

  it('deve criar uma rota com os defaults corretos', async () => {
    const rota = await Rota.create({ rota: 'itens', dominio: 'localhost' });
    expect(rota._id).toBeDefined();
    expect(rota.ativo).toBe(false);
    expect(rota.buscar).toBe(false);
    expect(rota.enviar).toBe(false);
    expect(rota.substituir).toBe(false);
    expect(rota.modificar).toBe(false);
    expect(rota.excluir).toBe(false);
  });

  it('deve normalizar rota para minusculo antes de salvar', async () => {
    const rota = await Rota.create({ rota: 'ITENS', dominio: 'localhost' });
    expect(rota.rota).toBe('itens');
  });

  it('não deve criar sem dominio', async () => {
    const rota = new Rota({ rota: 'itens' });
    await expect(rota.save()).rejects.toThrow();
  });

  it('não deve permitir rota+dominio duplicados', async () => {
    await Rota.create({ rota: 'itens', dominio: 'localhost' });
    await expect(
      Rota.create({ rota: 'itens', dominio: 'localhost' }),
    ).rejects.toThrow();
  });

  it('permite a mesma rota em dominios diferentes', async () => {
    await Rota.create({ rota: 'itens', dominio: 'localhost' });
    const outra = await Rota.create({ rota: 'itens', dominio: 'outrodominio' });
    expect(outra._id).toBeDefined();
  });
});
