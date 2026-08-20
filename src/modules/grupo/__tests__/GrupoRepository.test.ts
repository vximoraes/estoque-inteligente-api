import GrupoRepository from '../GrupoRepository.js';
import GrupoModel from '../GrupoModel.js';
import RotaModel from '../../rota/RotaModel.js';
import UsuarioModel from '../../usuario/UsuarioModel.js';

jest.mock('../GrupoModel.js');
jest.mock('../../rota/RotaModel.js');
jest.mock('../../usuario/UsuarioModel.js');

const mockGrupo = {
  save: jest.fn(),
  permissoes: [],
};

GrupoModel.mockImplementation(() => mockGrupo);
GrupoModel.findOne = jest.fn();
GrupoModel.findById = jest.fn();
GrupoModel.findByIdAndUpdate = jest.fn();
GrupoModel.findByIdAndDelete = jest.fn();
GrupoModel.paginate = jest.fn();

RotaModel.find = jest.fn();

UsuarioModel.findOne = jest.fn();

describe('GrupoRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGrupo.permissoes = [];
    repository = new GrupoRepository({
      grupoModel: GrupoModel,
      rotaModel: RotaModel,
      usuarioModel: UsuarioModel,
    });
  });

  describe('obterRotasUnicas', () => {
    it('deve remover rotas duplicadas', async () => {
      const resultado = await repository.obterRotasUnicas([
        { rota: 'itens' },
        { rota: 'itens' },
        { rota: 'usuarios' },
      ]);
      expect(resultado).toEqual([{ rota: 'itens' }, { rota: 'usuarios' }]);
    });
  });

  describe('obterPermissoesDuplicadas', () => {
    it('deve retornar permissões cuja rota se repete', () => {
      const permissoes = [
        { rota: 'itens' },
        { rota: 'itens' },
        { rota: 'usuarios' },
      ];
      const resultado = repository.obterPermissoesDuplicadas(permissoes);
      expect(resultado).toEqual([{ rota: 'itens' }]);
    });

    it('deve retornar vazio quando não há duplicatas', () => {
      const permissoes = [{ rota: 'itens' }, { rota: 'usuarios' }];
      expect(repository.obterPermissoesDuplicadas(permissoes)).toEqual([]);
    });
  });

  describe('buscarPorNome', () => {
    it('deve buscar grupo por nome', async () => {
      GrupoModel.findOne.mockResolvedValue({ nome: 'Admin' });
      const resultado = await repository.buscarPorNome('Admin');
      expect(GrupoModel.findOne).toHaveBeenCalledWith({ nome: 'Admin' });
      expect(resultado).toEqual({ nome: 'Admin' });
    });

    it('deve ignorar id informado', async () => {
      GrupoModel.findOne.mockResolvedValue(null);
      await repository.buscarPorNome('Admin', 'idIgnorado');
      expect(GrupoModel.findOne).toHaveBeenCalledWith({
        nome: 'Admin',
        _id: { $ne: 'idIgnorado' },
      });
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar grupo quando existe', async () => {
      GrupoModel.findById.mockResolvedValue({ _id: '1' });
      const resultado = await repository.buscarPorId('1');
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando não existe', async () => {
      GrupoModel.findById.mockResolvedValue(null);
      await expect(repository.buscarPorId('1')).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });
  });

  describe('buscarPorPermissao', () => {
    it('deve buscar rotas pela lista de nomes', async () => {
      RotaModel.find.mockResolvedValue([{ rota: 'itens' }]);
      const resultado = await repository.buscarPorPermissao([
        { rota: 'itens' },
      ]);
      expect(RotaModel.find).toHaveBeenCalledWith({
        rota: { $in: ['itens'] },
      });
      expect(resultado).toEqual([{ rota: 'itens' }]);
    });
  });

  describe('listar', () => {
    it('deve retornar grupo por id quando informado', async () => {
      const populateMock = jest.fn().mockResolvedValue({ _id: '1' });
      GrupoModel.findById.mockReturnValue({ populate: populateMock });

      const resultado = await repository.listar({
        params: { id: '1' },
        query: {},
      });

      expect(populateMock).toHaveBeenCalledWith('permissoes');
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando id informado não existe', async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      GrupoModel.findById.mockReturnValue({ populate: populateMock });

      await expect(
        repository.listar({ params: { id: '1' }, query: {} }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });

    it('deve paginar e anexar estatísticas de permissões aos docs', async () => {
      const doc = {
        toObject: () => ({ _id: '1', nome: 'Admin', permissoes: [{}, {}] }),
      };
      GrupoModel.paginate.mockResolvedValue({ docs: [doc], totalDocs: 1 });

      const resultado = await repository.listar({
        params: {},
        query: { nome: 'Admin', page: '2', limite: '5' },
      });

      expect(GrupoModel.paginate).toHaveBeenCalledWith(
        { nome: { $regex: 'Admin', $options: 'i' }, ativo: true },
        expect.objectContaining({
          page: 2,
          limit: 5,
          populate: ['permissoes'],
        }),
      );
      expect(resultado.docs[0]).toMatchObject({
        _id: '1',
        nome: 'Admin',
        estatisticas: { totalPermissoes: 2 },
      });
    });

    it('deve limitar o limite máximo de paginação', async () => {
      GrupoModel.paginate.mockResolvedValue({ docs: [] });
      await repository.listar({ params: {}, query: { limite: '9999' } });
      expect(GrupoModel.paginate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('deve envolver erro inesperado em CustomError 500', async () => {
      GrupoModel.paginate.mockRejectedValue(new Error('falha de conexão'));
      await expect(
        repository.listar({ params: {}, query: {} }),
      ).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'internalServerError',
      });
    });

    it('deve repropagar CustomError sem envolver de novo', async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      GrupoModel.findById.mockReturnValue({ populate: populateMock });
      await expect(
        repository.listar({ params: { id: '1' }, query: {} }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('verificarUsuariosAssociados', () => {
    it('deve retornar usuário associado ao grupo', async () => {
      UsuarioModel.findOne.mockResolvedValue({ _id: 'u1' });
      const resultado = await repository.verificarUsuariosAssociados('g1');
      expect(UsuarioModel.findOne).toHaveBeenCalledWith({ grupos: 'g1' });
      expect(resultado).toEqual({ _id: 'u1' });
    });

    it('deve envolver erro inesperado em CustomError 500', async () => {
      UsuarioModel.findOne.mockRejectedValue(new Error('falha'));
      await expect(
        repository.verificarUsuariosAssociados('g1'),
      ).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'internalServerError',
      });
    });
  });

  describe('criar', () => {
    it('deve criar e salvar um grupo', async () => {
      mockGrupo.save.mockResolvedValue({ _id: '1', nome: 'Admin' });
      const resultado = await repository.criar({ nome: 'Admin' });
      expect(mockGrupo.save).toHaveBeenCalled();
      expect(resultado).toEqual({ _id: '1', nome: 'Admin' });
    });
  });

  describe('atualizar', () => {
    it('deve atualizar grupo existente', async () => {
      GrupoModel.findByIdAndUpdate.mockResolvedValue({
        _id: '1',
        nome: 'Novo',
      });
      const resultado = await repository.atualizar('1', { nome: 'Novo' });
      expect(resultado).toEqual({ _id: '1', nome: 'Novo' });
    });

    it('deve lançar 404 quando grupo não existe', async () => {
      GrupoModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(
        repository.atualizar('1', { nome: 'Novo' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });

    it('deve envolver erro inesperado em CustomError 500', async () => {
      GrupoModel.findByIdAndUpdate.mockRejectedValue(new Error('falha'));
      await expect(
        repository.atualizar('1', { nome: 'Novo' }),
      ).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'internalServerError',
      });
    });
  });

  describe('deletar', () => {
    it('deve deletar grupo existente', async () => {
      GrupoModel.findByIdAndDelete.mockResolvedValue({ _id: '1' });
      const resultado = await repository.deletar('1');
      expect(resultado).toEqual({ _id: '1' });
    });

    it('deve lançar 404 quando grupo não existe', async () => {
      GrupoModel.findByIdAndDelete.mockResolvedValue(null);
      await expect(repository.deletar('1')).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });

    it('deve envolver erro inesperado em CustomError 500', async () => {
      GrupoModel.findByIdAndDelete.mockRejectedValue(new Error('falha'));
      await expect(repository.deletar('1')).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'internalServerError',
      });
    });
  });

  describe('adiciotarRota', () => {
    it('deve adicionar rota às permissões do grupo', async () => {
      GrupoModel.findById.mockResolvedValue(mockGrupo);
      mockGrupo.save.mockResolvedValue(mockGrupo);
      const rota = { rota: 'itens' };

      await repository.adiciotarRota('1', rota);

      expect(mockGrupo.permissoes).toContainEqual(rota);
      expect(mockGrupo.save).toHaveBeenCalled();
    });

    it('deve lançar 404 quando grupo não existe', async () => {
      GrupoModel.findById.mockResolvedValue(null);
      await expect(
        repository.adiciotarRota('1', { rota: 'itens' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorType: 'resourceNotFound',
      });
    });

    it('deve envolver erro inesperado em CustomError 500', async () => {
      GrupoModel.findById.mockRejectedValue(new Error('falha'));
      await expect(
        repository.adiciotarRota('1', { rota: 'itens' }),
      ).rejects.toMatchObject({
        statusCode: 500,
        errorType: 'internalServerError',
      });
    });
  });
});
