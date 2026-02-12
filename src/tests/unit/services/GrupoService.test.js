import GrupoService from '../../../services/GrupoService.js';
import GrupoRepository from '../../../repositories/GrupoRepository.js';
import UsuarioRepository from '../../../repositories/UsuarioRepository.js';
import { CustomError, HttpStatusCodes } from '../../../utils/helpers/index.js';

jest.mock('../../../repositories/GrupoRepository.js');
jest.mock('../../../repositories/UsuarioRepository.js');

const makeGrupo = (props = {}) => ({
    _id: 'grupo1',
    nome: 'Administradores',
    descricao: 'Grupo administrativo',
    ativo: true,
    permissoes: [],
    usuario: 'user123',
    ...props
});

const makeUser = (props = {}) => ({
    _id: 'user123',
    id: 'user123',
    nome: 'Usuario Teste',
    toObject: () => ({
        _id: 'user123',
        grupos: []
    }),
    ...props
});

describe('GrupoService', () => {
    let service, repositoryMock, usuarioRepositoryMock;

    beforeEach(() => {
        GrupoRepository.mockClear();
        UsuarioRepository.mockClear();
        
        repositoryMock = {
            criar: jest.fn(),
            listar: jest.fn(),
            atualizar: jest.fn(),
            deletar: jest.fn(),
            buscarPorNome: jest.fn(),
            buscarPorId: jest.fn()
        };

        usuarioRepositoryMock = {
            buscarPorId: jest.fn()
        };

        GrupoRepository.mockImplementation(() => repositoryMock);
        UsuarioRepository.mockImplementation(() => usuarioRepositoryMock);
        
        service = new GrupoService();
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve cadastrar grupo com nome único', async () => {
            const grupoData = { nome: 'Operadores', descricao: 'Grupo operacional' };
            
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.criar.mockResolvedValue(makeGrupo(grupoData));

            const result = await service.criar(grupoData);

            expect(result).toHaveProperty('_id');
            expect(repositoryMock.buscarPorNome).toHaveBeenCalledWith('Operadores');
            expect(repositoryMock.criar).toHaveBeenCalledWith(grupoData);
        });

        it('deve lançar erro se nome já existir', async () => {
            const grupoData = { nome: 'Administradores', descricao: 'Grupo admin' };
            
            repositoryMock.buscarPorNome.mockResolvedValue(makeGrupo());

            await expect(service.criar(grupoData))
                .rejects.toThrow(CustomError);
        });

        it('deve propagar erro do repository', async () => {
            const grupoData = { nome: 'Teste', descricao: 'Teste' };
            
            repositoryMock.buscarPorNome.mockRejectedValue(new Error('Database error'));

            await expect(service.criar(grupoData))
                .rejects.toThrow('Database error');
        });
    });

    describe('listar', () => {
        it('deve retornar todos os grupos', async () => {
            const req = { user_id: 'user123' };
            const grupos = [
                makeGrupo(),
                makeGrupo({ _id: 'grupo2', nome: 'Usuários', descricao: 'Grupo usuários' })
            ];
            
            repositoryMock.listar.mockResolvedValue(grupos);

            const result = await service.listar(req);

            expect(result).toEqual(grupos);
            expect(repositoryMock.listar).toHaveBeenCalledWith(req);
        });

        it('deve retornar array vazio quando não há grupos', async () => {
            const req = { user_id: 'user123' };
            
            repositoryMock.listar.mockResolvedValue([]);

            const result = await service.listar(req);

            expect(result).toEqual([]);
        });

        it('deve propagar erro do repository', async () => {
            const req = { user_id: 'user123' };
            
            repositoryMock.listar.mockRejectedValue(new Error('Database error'));

            await expect(service.listar(req))
                .rejects.toThrow('Database error');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar grupo existente', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            const dadosAtualizacao = { nome: 'Novo Nome', descricao: 'Nova descrição' };
            const grupoAtualizado = makeGrupo(dadosAtualizacao);
            
            repositoryMock.buscarPorId.mockResolvedValue(makeGrupo());
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.atualizar.mockResolvedValue(grupoAtualizado);
            usuarioRepositoryMock.buscarPorId.mockResolvedValue(user);

            const result = await service.atualizar(dadosAtualizacao, grupoId, user);

            expect(result).toEqual(grupoAtualizado);
            expect(repositoryMock.buscarPorId).toHaveBeenCalledWith(grupoId);
            expect(repositoryMock.buscarPorNome).toHaveBeenCalledWith('Novo Nome', grupoId);
            expect(repositoryMock.atualizar).toHaveBeenCalledWith(grupoId, dadosAtualizacao);
        });

        it('deve lançar erro se nome já existe em outro grupo', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            const dadosAtualizacao = { nome: 'Nome Existente' };
            const grupoExistente = makeGrupo({ _id: 'grupo2', nome: 'Nome Existente' });
            
            repositoryMock.buscarPorId.mockResolvedValue(makeGrupo());
            repositoryMock.buscarPorNome.mockResolvedValue(grupoExistente);
            usuarioRepositoryMock.buscarPorId.mockResolvedValue(user);

            await expect(service.atualizar(dadosAtualizacao, grupoId, user))
                .rejects.toThrow(CustomError);
        });

        it('deve propagar erro do repository', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            const dadosAtualizacao = { nome: 'Teste' };
            
            repositoryMock.buscarPorId.mockRejectedValue(new Error('Database error'));

            await expect(service.atualizar(dadosAtualizacao, grupoId, user))
                .rejects.toThrow('Database error');
        });
    });

    describe('deletar', () => {
        it('deve deletar grupo existente', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            
            repositoryMock.buscarPorId.mockResolvedValue(makeGrupo());
            repositoryMock.deletar.mockResolvedValue({ deletedCount: 1 });
            usuarioRepositoryMock.buscarPorId.mockResolvedValue(user);

            const result = await service.deletar(grupoId, user);

            expect(result).toEqual({ deletedCount: 1 });
            expect(repositoryMock.buscarPorId).toHaveBeenCalledWith(grupoId);
            expect(repositoryMock.deletar).toHaveBeenCalledWith(grupoId);
        });

        it('deve propagar erro do repository', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            
            repositoryMock.buscarPorId.mockRejectedValue(new Error('Database error'));

            await expect(service.deletar(grupoId, user))
                .rejects.toThrow('Database error');
        });
    });

    describe('verificarGrupo', () => {
        it('deve verificar grupo sem lançar erro quando grupo não está na lista', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            
            usuarioRepositoryMock.buscarPorId.mockResolvedValue(user);

            await expect(service.verificarGrupo(user, grupoId)).resolves.not.toThrow();
        });

        it('deve lançar erro quando grupo está na lista do usuário', async () => {
            const user = makeUser();
            const grupoId = 'grupo1';
            
            const usuarioComGrupos = {
                ...user,
                toObject: () => ({
                    _id: 'user123',
                    grupos: [{ _id: grupoId }]
                })
            };
            
            usuarioRepositoryMock.buscarPorId.mockResolvedValue(usuarioComGrupos);

            await expect(service.verificarGrupo(user, grupoId))
                .rejects.toThrow(CustomError);
        });
    });
});
