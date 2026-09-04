import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import EmprestimoRepository from '../EmprestimoRepository.js';
import Emprestimo from '../EmprestimoModel.js';
import Localizacao from '../../localizacao/LocalizacaoModel.js';

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
  await Emprestimo.deleteMany({});
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

describe('EmprestimoRepository — tendencia', () => {
  let repository;
  let localizacao;
  let usuarioId;

  beforeEach(async () => {
    repository = new EmprestimoRepository();
    usuarioId = new mongoose.Types.ObjectId();
    localizacao = await Localizacao.create({
      nome: 'Almoxarifado Central',
      usuario: usuarioId,
    });
  });

  it('agrega empréstimos por data_saida e devoluções por data_devolucao_total, mês a mês', async () => {
    await Emprestimo.create([
      {
        item: new mongoose.Types.ObjectId(),
        localizacao: localizacao._id,
        tipo_controle: 'quantidade',
        quantidade_emprestada: 2,
        quantidade_devolvida: 0,
        quantidade_aberta: 2,
        solicitante_nome: 'Fulano',
        usuario_responsavel: usuarioId,
        data_saida: mesReferencia(0),
      },
      {
        item: new mongoose.Types.ObjectId(),
        localizacao: localizacao._id,
        tipo_controle: 'quantidade',
        quantidade_emprestada: 1,
        quantidade_devolvida: 1,
        quantidade_aberta: 0,
        solicitante_nome: 'Ciclana',
        usuario_responsavel: usuarioId,
        data_saida: mesReferencia(1),
        data_devolucao_total: mesReferencia(0),
      },
    ]);

    const req = { query: { meses: '6' } };
    const pontos = await repository.tendencia(req);

    expect(pontos).toHaveLength(6);

    const mesAtual = pontos[pontos.length - 1];
    expect(mesAtual.emprestimos).toBe(1);
    expect(mesAtual.devolucoes).toBe(1);

    const mesAnterior = pontos[pontos.length - 2];
    expect(mesAnterior.emprestimos).toBe(1);
    expect(mesAnterior.devolucoes).toBe(0);
  });

  it('ignora empréstimos inativos (excluídos)', async () => {
    await Emprestimo.create({
      item: new mongoose.Types.ObjectId(),
      localizacao: localizacao._id,
      tipo_controle: 'quantidade',
      quantidade_emprestada: 1,
      quantidade_devolvida: 0,
      quantidade_aberta: 1,
      solicitante_nome: 'Fulano',
      usuario_responsavel: usuarioId,
      data_saida: new Date(),
      ativo: false,
    });

    const req = { query: {} };
    const pontos = await repository.tendencia(req);
    const total = pontos.reduce((soma, p) => soma + p.emprestimos, 0);
    expect(total).toBe(0);
  });

  it('preenche todos os meses com zero quando não há dado', async () => {
    const req = { query: { meses: '24' } };
    const pontos = await repository.tendencia(req);
    expect(pontos).toHaveLength(24);
    expect(pontos.every((p) => p.emprestimos === 0 && p.devolucoes === 0)).toBe(
      true,
    );
  });

  it('aceita período personalizado (data_inicio/data_fim), ignorando meses', async () => {
    await Emprestimo.create([
      {
        item: new mongoose.Types.ObjectId(),
        localizacao: localizacao._id,
        tipo_controle: 'quantidade',
        quantidade_emprestada: 1,
        quantidade_devolvida: 0,
        quantidade_aberta: 1,
        solicitante_nome: 'Fulano',
        usuario_responsavel: usuarioId,
        data_saida: mesReferencia(4),
      },
      {
        item: new mongoose.Types.ObjectId(),
        localizacao: localizacao._id,
        tipo_controle: 'quantidade',
        quantidade_emprestada: 1,
        quantidade_devolvida: 0,
        quantidade_aberta: 1,
        solicitante_nome: 'Beltrano',
        usuario_responsavel: usuarioId,
        data_saida: mesReferencia(1),
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

    expect(pontos).toHaveLength(3);
    const totalEmprestimos = pontos.reduce((acc, p) => acc + p.emprestimos, 0);
    expect(totalEmprestimos).toBe(1);
  });
});
