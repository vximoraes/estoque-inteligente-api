import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import IAUso from '../IAUsoModel.js';
import {
  registrarUso,
  tokensUsadosHoje,
  derivarTokens,
  calcularCustoDetalhado,
} from '../IAUsoService.js';

let mongoServer;
const usuarioId = 'usuario-1';
const conversaId = new mongoose.Types.ObjectId().toString();

describe('derivarTokens', () => {
  it('deriva tokens de pensamento a partir da diferença entre totais e entrada+saída', () => {
    expect(derivarTokens(1000, 100, 1500)).toEqual({
      tokensPensamento: 400,
      tokensSaidaFaturavel: 500,
    });
  });

  it('nunca retorna tokens de pensamento negativos', () => {
    expect(derivarTokens(1000, 100, 900)).toEqual({
      tokensPensamento: 0,
      tokensSaidaFaturavel: 100,
    });
  });
});

describe('calcularCustoDetalhado', () => {
  it('calcula input/output separadamente pela tabela de preços do modelo', () => {
    const custo = calcularCustoDetalhado('gemini-3.5-flash-lite', 1000, 500);
    expect(custo?.input).toBeCloseTo(0.0003, 6);
    expect(custo?.output).toBeCloseTo(0.00125, 6);
  });

  it('retorna null para modelo sem preço cadastrado (Langfuse não infere custo em cima disso)', () => {
    expect(calcularCustoDetalhado('modelo-desconhecido', 1000, 500)).toBeNull();
  });

  it('a soma de input+output bate com o custo_estimado_usd persistido por registrarUso', async () => {
    const custo = calcularCustoDetalhado('gemini-3.5-flash-lite', 1000, 500);
    const somaDetalhada = (custo?.input ?? 0) + (custo?.output ?? 0);
    expect(somaDetalhada).toBeCloseTo(0.00155, 6);
  });
});

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
