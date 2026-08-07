import UsuarioFilterBuilder from '../UsuarioFilterBuilder.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';

describe('UsuarioFilterBuilder', () => {
  it('deve criar e combinar filtros corretamente', () => {
    const builder = new UsuarioFilterBuilder();
    expect(builder.build()).toEqual({});

    const builderComFiltros = new UsuarioFilterBuilder()
      .comNome('Maria')
      .comEmail('maria@email.com')
      .comAtivo('true');
    expect(builderComFiltros.build()).toEqual({
      nome: { $regex: escapeRegex('Maria'), $options: 'i' },
      email: { $regex: escapeRegex('maria@email.com'), $options: 'i' },
      ativo: true,
    });
  });

  it('escapeRegex deve escapar caracteres especiais', () => {
    const texto = 'nome.*[teste]';
    expect(escapeRegex(texto)).toBe('nome\\.\\*\\[teste\\]');
  });

  it('não deve adicionar filtro de nome/email se valor for vazio', () => {
    const builder = new UsuarioFilterBuilder().comNome('').comEmail('');
    expect(builder.build()).toEqual({});
  });
});
