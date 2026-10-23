import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { garantirIndices } from '../indices.js';
import logger from '../../utils/logger.js';
import Notificacao, {
  DIAS_PARA_APAGAR_LIDA,
} from '../../modules/notificacao/NotificacaoModel.js';
import '../../modules/movimentacao/MovimentacaoModel.js';
import '../../modules/emprestimo/EmprestimoModel.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function nomesDosIndices(colecao: string) {
  const indices = await mongoose.connection.db!.collection(colecao).indexes();
  return indices.map((indice) => indice.name);
}

describe('garantirIndices', () => {
  it('remove os índices obsoletos de um banco antigo e cria os novos', async () => {
    const db = mongoose.connection.db!;
    await db.collection('movimentacoes').createIndex({ tipo: 1 });
    await db.collection('emprestimos').createIndex({ ativo: 1 });
    await db.collection('notificacoes').createIndex({ mensagem: 1 });

    await garantirIndices();

    expect(await nomesDosIndices('movimentacoes')).not.toContain('tipo_1');
    expect(await nomesDosIndices('emprestimos')).not.toContain('ativo_1');
    const notificacoes = await nomesDosIndices('notificacoes');
    expect(notificacoes).not.toContain('mensagem_1');
    expect(notificacoes).toContain('usuario_1_ativo_1_data_hora_-1');
  });

  it('expira a notificação lida depois do prazo', async () => {
    await garantirIndices();
    const indices = await Notificacao.collection.indexes();
    const ttl = indices.find((indice) => indice.name === 'dataLeitura_1');
    expect(ttl?.expireAfterSeconds).toBe(DIAS_PARA_APAGAR_LIDA * 24 * 60 * 60);
  });

  it('roda de novo sem falha quando os obsoletos já não existem', async () => {
    const erro = jest.spyOn(logger, 'error').mockImplementation(() => {});
    await garantirIndices();
    await garantirIndices();
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
