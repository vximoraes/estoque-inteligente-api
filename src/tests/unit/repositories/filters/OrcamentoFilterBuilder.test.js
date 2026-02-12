import OrcamentoFilterBuilder from '../../../../repositories/filters/OrcamentoFilterBuilder.js';

describe('OrcamentoFilterBuilder', () => {
    it('build deve retornar objeto vazio por padrão', () => {
        const builder = new OrcamentoFilterBuilder();
        expect(builder.build()).toEqual({});
    });

    it('comNome adiciona filtro regex de nome', () => {
        const builder = new OrcamentoFilterBuilder();
        builder.comNome('Teste');
        expect(builder.build()).toEqual({ nome: { $regex: 'Teste', $options: 'i' } });
    });

    it('ignora filtros se valores falsy', () => {
        const builder = new OrcamentoFilterBuilder();
        builder.comNome('');
        expect(builder.build()).toEqual({});
    });
});
