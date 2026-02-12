import UsuarioFilterBuilder from '../../../../repositories/filters/UsuarioFilterBuilder.js';

describe('UsuarioFilterBuilder', () => {
    it('deve criar e combinar filtros corretamente', () => {
        const builder = new UsuarioFilterBuilder();
        expect(builder.build()).toEqual({});

        const builderComFiltros = new UsuarioFilterBuilder()
            .comNome('Maria')
            .comEmail('maria@email.com')
            .comAtivo('true');
        expect(builderComFiltros.build()).toEqual({
            nome: { $regex: 'Maria', $options: 'i' },
            email: { $regex: 'maria@email.com', $options: 'i' },
            ativo: true
        });
    });

    it('escapeRegex deve escapar caracteres especiais', () => {
        const builder = new UsuarioFilterBuilder();
        const texto = 'nome.*[teste]';
        expect(builder.escapeRegex(texto)).toBe('nome\\.\\*\\[teste\\]');
    });

    it('não deve adicionar filtro de nome/email se valor for vazio', () => {
        const builder = new UsuarioFilterBuilder().comNome('').comEmail('');
        expect(builder.build()).toEqual({});
    });
});