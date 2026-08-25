import mongoose from 'mongoose';
import PatrimonioFilterBuilder from '../PatrimonioFilterBuilder.js';
import CategoriaModel from '../../categoria/CategoriaModel.js';

describe('PatrimonioFilterBuilder', () => {
  it('deve retornar objeto vazio quando nenhum filtro é aplicado (exceto ativo default)', () => {
    const filtros = new PatrimonioFilterBuilder().build();
    expect(filtros).toEqual({});
  });

  it('comModelo deve montar regex case-insensitive de correspondência exata', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comModelo('ThinkPad T14')
      .build();
    expect(filtros['modelo']).toEqual({
      $regex: '^ThinkPad\\ T14$',
      $options: 'i',
    });
  });

  it('comModelo deve ignorar valor vazio', () => {
    const filtros = new PatrimonioFilterBuilder().comModelo('').build();
    expect(filtros['modelo']).toBeUndefined();
  });

  it('comStatus deve aceitar apenas valores do enum', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comStatus('Disponível')
      .build();
    expect(filtros['status']).toBe('Disponível');

    const filtrosInvalidos = new PatrimonioFilterBuilder()
      .comStatus('Inexistente')
      .build();
    expect(filtrosInvalidos['status']).toBeUndefined();
  });

  it('comLocalizacao deve filtrar por ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder().comLocalizacao(id).build();
    expect((filtros['localizacao'] as mongoose.Types.ObjectId).toString()).toBe(
      id,
    );
  });

  it('comNumeroPatrimonio deve montar regex case-insensitive (escapando caracteres especiais)', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comNumeroPatrimonio('nb-001')
      .build();
    expect(filtros['numero_patrimonio']).toEqual({
      $regex: 'nb\\-001',
      $options: 'i',
    });
  });

  describe('comBusca', () => {
    it('não deve alterar filtros quando busca está vazia', () => {
      const filtros = new PatrimonioFilterBuilder().comBusca('').build();
      expect(filtros).toEqual({});
    });

    it('deve montar $or casando número de patrimônio OU modelo', () => {
      const filtros = new PatrimonioFilterBuilder().comBusca('NB-002').build();

      expect(filtros['$or']).toEqual([
        { numero_patrimonio: { $regex: 'NB\\-002', $options: 'i' } },
        { modelo: { $regex: 'NB\\-002', $options: 'i' } },
      ]);
    });
  });

  describe('comCategoria', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('não deve alterar filtros quando categoria está vazia', async () => {
      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('');
      expect(builder.build()).toEqual({});
    });

    it('deve filtrar por ID de categoria válido', async () => {
      const categoriaId = new mongoose.Types.ObjectId();
      jest
        .spyOn(CategoriaModel, 'findById')
        .mockResolvedValue({ _id: categoriaId });

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria(categoriaId.toString());

      expect(builder.build()).toEqual({ categoria: categoriaId });
    });

    it('deve filtrar por nome de categoria', async () => {
      const categoriaId = new mongoose.Types.ObjectId();
      jest
        .spyOn(CategoriaModel, 'findOne')
        .mockResolvedValue({ _id: categoriaId });

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('Rede');

      expect(CategoriaModel.findOne).toHaveBeenCalledWith({
        nome: { $regex: 'Rede', $options: 'i' },
      });
      expect(builder.build()).toEqual({ categoria: categoriaId });
    });

    it('deve devolver $in vazio quando a categoria não existe (não a coleção toda)', async () => {
      jest.spyOn(CategoriaModel, 'findOne').mockResolvedValue(null);

      const builder = new PatrimonioFilterBuilder();
      await builder.comCategoria('Inexistente');

      expect(builder.build()).toEqual({ categoria: { $in: [] } });
    });
  });

  it('comAtivo deve mapear "true"/"false" para booleano', () => {
    expect(new PatrimonioFilterBuilder().comAtivo('true').build()).toEqual({
      ativo: true,
    });
    expect(new PatrimonioFilterBuilder().comAtivo('false').build()).toEqual({
      ativo: false,
    });
  });

  it('deve encadear múltiplos filtros', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comModelo('Notebook')
      .comStatus('Manutenção')
      .comAtivo('true')
      .build();
    expect(filtros['status']).toBe('Manutenção');
    expect(filtros['ativo']).toBe(true);
    expect(filtros['modelo']).toBeDefined();
  });
});
