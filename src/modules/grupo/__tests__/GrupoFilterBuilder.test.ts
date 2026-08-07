import GrupoFilterBuilder from '../GrupoFilterBuilder.js';

describe('GrupoFilterBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new GrupoFilterBuilder();
  });

  describe('comNome', () => {
    it('deve adicionar filtro de nome quando informado', () => {
      const resultado = builder.comNome('Administradores');
      expect(builder.build()).toEqual({
        nome: { $regex: 'Administradores', $options: 'i' },
      });
      expect(resultado).toBe(builder);
    });

    it('deve escapar caracteres especiais de regex no nome', () => {
      builder.comNome('a.b*c');
      expect(builder.build()).toEqual({
        nome: { $regex: 'a\\.b\\*c', $options: 'i' },
      });
    });

    it.each([null, undefined, ''])(
      'não deve adicionar filtro de nome para %p',
      (valor) => {
        builder.comNome(valor);
        expect(builder.build()).toEqual({});
      },
    );
  });

  describe('comDescricao', () => {
    it('deve adicionar filtro de descrição quando informada', () => {
      const resultado = builder.comDescricao('Acesso total');
      expect(builder.build()).toEqual({
        descricao: { $regex: 'Acesso\\ total', $options: 'i' },
      });
      expect(resultado).toBe(builder);
    });

    it('deve escapar caracteres especiais de regex na descrição', () => {
      builder.comDescricao('x+y?');
      expect(builder.build()).toEqual({
        descricao: { $regex: 'x\\+y\\?', $options: 'i' },
      });
    });

    it.each([null, undefined, ''])(
      'não deve adicionar filtro de descrição para %p',
      (valor) => {
        builder.comDescricao(valor);
        expect(builder.build()).toEqual({});
      },
    );
  });

  describe('comAtivo', () => {
    it('deve filtrar ativo=true quando "true"', () => {
      builder.comAtivo('true');
      expect(builder.build()).toEqual({ ativo: true });
    });

    it('deve filtrar ativo=false quando "false"', () => {
      builder.comAtivo('false');
      expect(builder.build()).toEqual({ ativo: false });
    });

    it.each([null, undefined, '', 'qualquer'])(
      'não deve adicionar filtro de ativo para %p',
      (valor) => {
        builder.comAtivo(valor);
        expect(builder.build()).toEqual({});
      },
    );
  });

  describe('encadeamento', () => {
    it('deve combinar todos os filtros quando encadeado', () => {
      const filtros = builder
        .comNome('Admin')
        .comDescricao('Total')
        .comAtivo('true')
        .build();

      expect(filtros).toEqual({
        nome: { $regex: 'Admin', $options: 'i' },
        descricao: { $regex: 'Total', $options: 'i' },
        ativo: true,
      });
    });
  });
});
