import mongoose from 'mongoose';
import IAUso from '../IAUsoModel.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
const usuarioId = 'usuario-1';
const conversaId = new mongoose.Types.ObjectId();

describe('Modelo de IAUso', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await IAUso.deleteMany({});
  });

  it('deve criar um registro de uso válido', async () => {
    const uso = new IAUso({
      usuario: usuarioId,
      conversa: conversaId,
      modelo: 'gemini-3.5-flash-lite',
      tokens_entrada: 100,
      tokens_saida: 50,
      tokens_totais: 150,
      finalizado_por: 'concluido',
    });
    await uso.save();
    expect(uso._id).toBeDefined();
    expect(uso.usuario).toBe(usuarioId);
    expect(uso.conversa.toString()).toEqual(conversaId.toString());
  });

  it('não deve criar registro sem usuario, conversa, modelo ou finalizado_por', async () => {
    const uso = new IAUso({ tokens_entrada: 10 });
    await expect(uso.save()).rejects.toThrow();
  });

  it('não deve aceitar finalizado_por fora do enum', async () => {
    const uso = new IAUso({
      usuario: usuarioId,
      conversa: conversaId,
      modelo: 'gemini-3.5-flash-lite',
      finalizado_por: 'invalido',
    });
    await expect(uso.save()).rejects.toThrow();
  });

  it('deve aplicar defaults zero para campos numéricos não informados', async () => {
    const uso = await IAUso.create({
      usuario: usuarioId,
      conversa: conversaId,
      modelo: 'gemini-3.5-flash-lite',
      finalizado_por: 'erro',
    });
    expect(uso.tokens_entrada).toBe(0);
    expect(uso.tokens_pensamento).toBe(0);
    expect(uso.custo_estimado_usd).toBe(0);
  });

  it('deve permitir múltiplos registros de uso para a mesma conversa (sem cascade)', async () => {
    await IAUso.create([
      {
        usuario: usuarioId,
        conversa: conversaId,
        modelo: 'gemini-3.5-flash-lite',
        finalizado_por: 'concluido',
      },
      {
        usuario: usuarioId,
        conversa: conversaId,
        modelo: 'gemini-3.5-flash-lite',
        finalizado_por: 'concluido',
      },
    ]);
    const registros = await IAUso.find({ conversa: conversaId });
    expect(registros.length).toBe(2);
  });
});
