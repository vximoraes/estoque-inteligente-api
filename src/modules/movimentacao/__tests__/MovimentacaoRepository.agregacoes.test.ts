import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MovimentacaoRepository from '../MovimentacaoRepository.js';
import Movimentacao from '../MovimentacaoModel.js';
import Item from '../../item/ItemModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';
import '../../estoque/EstoqueModel.js';
import '../../fornecedor/FornecedorModel.js';
import '../../notificacao/NotificacaoModel.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Movimentacao.deleteMany({});
  await Item.deleteMany({});
  await Localizacao.deleteMany({});
});

function mesReferencia(mesesAtras) {
  const data = new Date();
  if (mesesAtras > 0) {
    // Dia fixo (15) só é seguro para meses já encerrados — o mês atual
    // (mesesAtras === 0) usa "agora" mesmo, sempre <= dataFim da janela.
    data.setUTCDate(15);
    data.setUTCMonth(data.getUTCMonth() - mesesAtras);
  }
  return data;
}

describe('MovimentacaoRepository — agregações de relatório', () => {
  let repository;
  let item;
  let localizacao;
  let usuarioId;

  beforeEach(async () => {
    repository = new MovimentacaoRepository();
    usuarioId = new mongoose.Types.ObjectId();
    item = await Item.create({
      nome: 'Resistor 1k',
      quantidade: 100,
      estoque_minimo: 10,
      categoria: new mongoose.Types.ObjectId(),
      usuario: usuarioId,
    });
    localizacao = await Localizacao.create({
      nome: 'Almoxarifado Central',
      usuario: usuarioId,
    });
  });

  describe('resumo', () => {
    it('agrega total, entradas, saídas e saldo respeitando os filtros', async () => {
      await Movimentacao.create([
        {
          tipo: 'entrada',
          quantidade: 10,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
        },
        {
          tipo: 'entrada',
          quantidade: 5,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
        },
        {
          tipo: 'saida',
          quantidade: 4,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
        },
      ]);

      const req = { query: {} };
      const resumo = await repository.resumo(req);

      expect(resumo.total_movimentacoes).toBe(3);
      expect(resumo.entradas).toBe(2);
      expect(resumo.saidas).toBe(1);
      expect(resumo.quantidade_entrada).toBe(15);
      expect(resumo.quantidade_saida).toBe(4);
      expect(resumo.saldo).toBe(11);
    });

    it('retorna tudo zerado quando não há movimentação no filtro', async () => {
      const req = { query: { tipo: 'entrada' } };
      const resumo = await repository.resumo(req);

      expect(resumo).toEqual({
        total_movimentacoes: 0,
        entradas: 0,
        saidas: 0,
        quantidade_entrada: 0,
        quantidade_saida: 0,
        saldo: 0,
      });
    });

    it('filtra por período (data_inicio/data_fim)', async () => {
      await Movimentacao.create([
        {
          tipo: 'entrada',
          quantidade: 10,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(3),
        },
        {
          tipo: 'entrada',
          quantidade: 7,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: new Date(),
        },
      ]);

      const req = {
        query: {
          data_inicio: new Date().toISOString().slice(0, 10),
        },
      };
      const resumo = await repository.resumo(req);

      expect(resumo.total_movimentacoes).toBe(1);
      expect(resumo.quantidade_entrada).toBe(7);
    });
  });

  describe('tendencia', () => {
    it('preenche meses sem movimentação com zero e agrega os com dado', async () => {
      await Movimentacao.create([
        {
          tipo: 'entrada',
          quantidade: 20,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(0),
        },
        {
          tipo: 'saida',
          quantidade: 6,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(0),
        },
        {
          tipo: 'entrada',
          quantidade: 9,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(2),
        },
      ]);

      const req = { query: { meses: '6' } };
      const pontos = await repository.tendencia(req);

      expect(pontos).toHaveLength(6);

      const mesAtual = pontos[pontos.length - 1];
      expect(mesAtual.entradas).toBe(1);
      expect(mesAtual.quantidade_entrada).toBe(20);
      expect(mesAtual.saidas).toBe(1);
      expect(mesAtual.quantidade_saida).toBe(6);

      const doisMesesAtras = pontos[pontos.length - 3];
      expect(doisMesesAtras.entradas).toBe(1);
      expect(doisMesesAtras.quantidade_entrada).toBe(9);

      const mesVazio = pontos[0];
      expect(mesVazio.entradas).toBe(0);
      expect(mesVazio.saidas).toBe(0);
    });

    it('usa 12 meses por padrão', async () => {
      const req = { query: {} };
      const pontos = await repository.tendencia(req);
      expect(pontos).toHaveLength(12);
    });

    it('aceita período personalizado (data_inicio/data_fim), ignorando meses', async () => {
      await Movimentacao.create([
        {
          tipo: 'entrada',
          quantidade: 3,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(4),
        },
        {
          tipo: 'entrada',
          quantidade: 8,
          item: item._id,
          localizacao: localizacao._id,
          usuario: usuarioId,
          data_hora: mesReferencia(1),
        },
      ]);

      const dataInicio = mesReferencia(4);
      dataInicio.setUTCDate(1);
      const req = {
        query: {
          meses: '6',
          data_inicio: dataInicio.toISOString().slice(0, 10),
          data_fim: mesReferencia(2).toISOString().slice(0, 10),
        },
      };
      const pontos = await repository.tendencia(req);

      // Janela de 4 a 2 meses atrás = 3 meses, não os 6 do parâmetro `meses`.
      expect(pontos).toHaveLength(3);
      expect(pontos[0].entradas).toBe(1);
      expect(pontos[0].quantidade_entrada).toBe(3);
      // mesReferencia(1) fica fora do período pedido (mais recente que data_fim).
      const totalEntradas = pontos.reduce((acc, p) => acc + p.entradas, 0);
      expect(totalEntradas).toBe(1);
    });
  });
});
