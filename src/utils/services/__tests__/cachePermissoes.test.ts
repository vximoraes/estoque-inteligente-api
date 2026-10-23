import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

function carregar(validadeMs: string) {
  process.env['CACHE_PERMISSOES_MS'] = validadeMs;
  let modulo;
  jest.isolateModules(() => {
    modulo = require('../cachePermissoes.js');
  });
  process.env['CACHE_PERMISSOES_MS'] = '0';
  return modulo;
}

describe('cachePermissoes', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('reaproveita o valor dentro da validade e busca de novo depois', async () => {
    jest.useFakeTimers();
    const { comCache } = carregar('30000');
    const buscar = jest.fn().mockResolvedValue(['itens']);

    await comCache('usuario:1', buscar);
    await comCache('usuario:1', buscar);
    expect(buscar).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30001);
    await comCache('usuario:1', buscar);
    expect(buscar).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('não guarda erro', async () => {
    const { comCache } = carregar('30000');
    const buscar = jest
      .fn()
      .mockRejectedValueOnce(new Error('banco fora'))
      .mockResolvedValue('ok');

    await expect(comCache('rota:itens', buscar)).rejects.toThrow('banco fora');
    expect(await comCache('rota:itens', buscar)).toBe('ok');
  });

  it('desligado com validade 0', async () => {
    const { comCache } = carregar('0');
    const buscar = jest.fn().mockResolvedValue(1);
    await comCache('x', buscar);
    await comCache('x', buscar);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('limpa ao gravar no model que registrou a limpeza', async () => {
    const { comCache, limparCacheAoGravar } = carregar('30000');
    const schema = new mongoose.Schema({ nome: String });
    limparCacheAoGravar(schema);
    const Modelo = mongoose.model('zz_cache_teste', schema);
    const buscar = jest.fn().mockResolvedValue('permissões');

    await comCache('usuario:2', buscar);
    const doc = await Modelo.create({ nome: 'a' });
    await comCache('usuario:2', buscar);
    await Modelo.updateOne({ _id: doc._id }, { nome: 'b' });
    await comCache('usuario:2', buscar);
    await comCache('usuario:2', buscar);

    expect(buscar).toHaveBeenCalledTimes(3);
  });
});
