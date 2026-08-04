import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import IAUso from '../IAUsoModel.js';
import { registrarUso, tokensUsadosHoje } from '../IAUsoService.js';

let mongoServer;
const usuarioId = 'usuario-1';
const conversaId = new mongoose.Types.ObjectId().toString();

describe('IAUsoService', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await IAUso.deleteMany({});
  });

  it('deve derivar tokens de pensamento e calcular custo estimado', async () => {
    await registrarUso({
      usuarioId,
      conversaId,
      modelo: 'gemini-3.5-flash-lite',
      tokensEntrada: 1000,
      tokensSaida: 100,
      tokensTotais: 1500,
      tokensCacheLeitura: 0,
      passosLlm: 1,
      ferramentasChamadas: 0,
      duracaoMs: 500,
      finalizadoPor: 'concluido',
    });

    const registro = await IAUso.findOne({ usuario: usuarioId });
    expect(registro?.tokens_pensamento).toBe(400);
    // (1000/1e6)*0.30 + (100+400)/1e6*2.50 = 0.0003 + 0.00125 = 0.00155
    expect(registro?.custo_estimado_usd).toBeCloseTo(0.00155, 6);
  });

  it('não deve lançar para modelo sem preço cadastrado', async () => {
    await expect(
      registrarUso({
        usuarioId,
        conversaId,
        modelo: 'modelo-desconhecido',
        tokensEntrada: 10,
        tokensSaida: 10,
        tokensTotais: 20,
        tokensCacheLeitura: 0,
        passosLlm: 1,
        ferramentasChamadas: 0,
        duracaoMs: 10,
        finalizadoPor: 'concluido',
      }),
    ).resolves.not.toThrow();

    const registro = await IAUso.findOne({ modelo: 'modelo-desconhecido' });
    expect(registro?.custo_estimado_usd).toBe(0);
  });

  it('não deve lançar quando o registro falha (ex.: conversaId inválido)', async () => {
    await expect(
      registrarUso({
        usuarioId,
        conversaId: 'id-invalido',
        modelo: 'gemini-3.5-flash-lite',
        tokensEntrada: 10,
        tokensSaida: 10,
        tokensTotais: 20,
        tokensCacheLeitura: 0,
        passosLlm: 1,
        ferramentasChamadas: 0,
        duracaoMs: 10,
        finalizadoPor: 'concluido',
      }),
    ).resolves.not.toThrow();
  });

  it('tokensUsadosHoje deve somar apenas registros do dia corrente', async () => {
    await IAUso.create({
      usuario: usuarioId,
      conversa: conversaId,
      modelo: 'gemini-3.5-flash-lite',
      tokens_totais: 1000,
      finalizado_por: 'concluido',
    });

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    await IAUso.create({
      usuario: usuarioId,
      conversa: conversaId,
      modelo: 'gemini-3.5-flash-lite',
      tokens_totais: 5000,
      finalizado_por: 'concluido',
      criado_em: ontem,
    });

    const total = await tokensUsadosHoje(usuarioId);
    expect(total).toBe(1000);
  });

  it('tokensUsadosHoje deve retornar 0 quando não há uso registrado', async () => {
    const total = await tokensUsadosHoje('usuario-sem-uso');
    expect(total).toBe(0);
  });
});
