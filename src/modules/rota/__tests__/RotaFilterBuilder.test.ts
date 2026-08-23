import RotaFilterBuilder from '../RotaFilterBuilder.js';

describe('RotaFilterBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new RotaFilterBuilder();
  });

  describe('comRota', () => {
    it('deve adicionar filtro de rota quando informada', () => {
      const resultado = builder.comRota('itens');
      expect(builder.build()).toEqual({
        rota: { $regex: 'itens', $options: 'i' },
      });
      expect(resultado).toBe(builder);
    });

    it.each([null, undefined, ''])(
      'não deve adicionar filtro de rota para %p',
      (valor) => {
        builder.comRota(valor);
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

  describe.each([
    ['comGet', 'buscar'],
    ['comPost', 'enviar'],
    ['comPut', 'substituir'],
    ['comPatch', 'modificar'],
    ['comDelete', 'excluir'],
  ])('%s', (metodo, campo) => {
    it(`deve filtrar ${campo}=true quando "true"`, () => {
      builder[metodo]('true');
      expect(builder.build()).toEqual({ [campo]: true });
    });

    it(`deve filtrar ${campo}=false quando "false"`, () => {
      builder[metodo]('false');
      expect(builder.build()).toEqual({ [campo]: false });
    });

    it.each([null, undefined, '', 'qualquer'])(
      `não deve adicionar filtro de ${campo} para %p`,
      (valor) => {
        builder[metodo](valor);
        expect(builder.build()).toEqual({});
      },
    );
  });

  describe('encadeamento', () => {
    it('deve combinar todos os filtros quando encadeado', () => {
      const filtros = builder
        .comRota('itens')
        .comAtivo('true')
        .comGet('true')
        .comPost('false')
        .comPut('true')
        .comPatch('false')
        .comDelete('true')
        .build();

      expect(filtros).toEqual({
        rota: { $regex: 'itens', $options: 'i' },
        ativo: true,
        buscar: true,
        enviar: false,
        substituir: true,
        modificar: false,
        excluir: true,
      });
    });
  });
});
