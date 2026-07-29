import OrcamentoFilterBuilder from '../OrcamentoFilterBuilder.js';

describe('OrcamentoFilterBuilder', () => {
  it('build deve retornar objeto vazio por padrão', () => {
    const builder = new OrcamentoFilterBuilder();
    expect(builder.build()).toEqual({});
  });

  it('comNome adiciona filtro regex de nome', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comNome('Teste');
    expect(builder.build()).toEqual({
      nome: { $regex: 'Teste', $options: 'i' },
    });
  });

  it('ignora filtros se valores falsy', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comNome('');
    expect(builder.build()).toEqual({});
  });

  it('comValor adiciona filtro de faixa com min e max', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comValor(10, 100);
    expect(builder.build()).toEqual({
      total: { $gte: 10, $lte: 100 },
    });
  });

  it('comValor adiciona filtro apenas com min', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comValor(10, undefined);
    expect(builder.build()).toEqual({
      total: { $gte: 10 },
    });
  });

  it('comValor adiciona filtro apenas com max', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comValor(undefined, 100);
    expect(builder.build()).toEqual({
      total: { $lte: 100 },
    });
  });

  it('comValor ignora filtro se ambos valores forem undefined', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comValor(undefined, undefined);
    expect(builder.build()).toEqual({});
  });

  it('comPeriodo adiciona filtro de data com início e fim', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comPeriodo('2026-01-01', '2026-01-31');
    expect(builder.build()).toEqual({
      createdAt: {
        $gte: new Date('2026-01-01T00:00:00.000Z'),
        $lte: new Date('2026-01-31T23:59:59.999Z'),
      },
    });
  });

  it('comPeriodo ignora filtro se ambas datas forem falsy', () => {
    const builder = new OrcamentoFilterBuilder();
    builder.comPeriodo('', '');
    expect(builder.build()).toEqual({});
  });
});
