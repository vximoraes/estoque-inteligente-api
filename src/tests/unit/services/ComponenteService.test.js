import ComponenteService from '../../../services/ComponenteService.js';
import ComponenteRepository from '../../../repositories/ComponenteRepository.js';
import LocalizacaoModel from '../../../models/Localizacao.js';
import CategoriaModel from '../../../models/Categoria.js';
import { CustomError } from '../../../utils/helpers/index.js';

jest.mock('../../../repositories/ComponenteRepository.js');
jest.mock('../../../models/Localizacao.js');
jest.mock('../../../models/Categoria.js');

const makeComponente = (props = {}) => ({
    _id: 'comp1',
    nome: 'Resistor',
    quantidade: 10,
    estoque_minimo: 2,
    valor_unitario: 0.5,
    categoria: 'cat1',
    localizacao: 'loc1',
    ativo: false,
    ...props
});
const makeCategoria = (props = {}) => ({ _id: 'cat1', nome: 'Passivo', ...props });
const makeLocalizacao = (props = {}) => ({ _id: 'loc1', nome: 'Estoque', ...props });

describe('ComponenteService', () => {
    let service, repositoryMock;
    beforeEach(() => {
        ComponenteRepository.mockClear();
        repositoryMock = {
            criar: jest.fn(),
            listar: jest.fn(),
            atualizar: jest.fn(),
            deletar: jest.fn(),
            buscarPorNome: jest.fn(),
            buscarPorId: jest.fn()
        };
        ComponenteRepository.mockImplementation(() => repositoryMock);
        service = new ComponenteService();
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve cadastrar componente com dados válidos', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            LocalizacaoModel.findOne.mockResolvedValue(makeLocalizacao());
            CategoriaModel.findOne.mockResolvedValue(makeCategoria());
            repositoryMock.criar.mockResolvedValue(makeComponente());
            const result = await service.criar({
                nome: 'Resistor',
                quantidade: 10,
                estoque_minimo: 2,
                valor_unitario: 0.5,
                categoria: 'cat1',
                localizacao: 'loc1'
            }, req);
            expect(result).toHaveProperty('_id');
            expect(repositoryMock.criar).toHaveBeenCalled();
        });
        it('deve lançar erro se nome já existir', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorNome.mockResolvedValue(makeComponente());
            await expect(service.criar({ nome: 'Resistor', localizacao: 'loc1', categoria: 'cat1' }, req))
                .rejects.toThrow(CustomError);
        });

        it('deve lançar erro se categoria não existir', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            LocalizacaoModel.findOne.mockResolvedValue(makeLocalizacao());
            CategoriaModel.findOne.mockResolvedValue(null);
            await expect(service.criar({ nome: 'Resistor', localizacao: 'loc1', categoria: 'catX' }, req))
                .rejects.toThrow(CustomError);
        });
        it('deve lançar erro inesperado do repository', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            LocalizacaoModel.findOne.mockResolvedValue(makeLocalizacao());
            CategoriaModel.findOne.mockResolvedValue(makeCategoria());
            repositoryMock.criar.mockRejectedValue(new Error('DB error'));
            await expect(service.criar({ nome: 'Resistor', localizacao: 'loc1', categoria: 'cat1' }, req))
                .rejects.toThrow('DB error');
        });
    });

    describe('listar', () => {
        it('deve retornar todos os componentes', async () => {
            const comps = [makeComponente(), makeComponente({ _id: 'comp2', nome: 'Capacitor' })];
            repositoryMock.listar.mockResolvedValue(comps);
            const result = await service.listar({});
            expect(result).toEqual(comps);
        });
        it('deve lançar erro inesperado do repository', async () => {
            repositoryMock.listar.mockRejectedValue(new Error('DB error'));
            await expect(service.listar({})).rejects.toThrow('DB error');
        });
    });

    describe('atualizar', () => {
        it('deve atualizar dados do componente, exceto quantidade', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.atualizar.mockResolvedValue(makeComponente({ nome: 'Novo Nome', quantidade: 10 }));
            const result = await service.atualizar('comp1', { nome: 'Novo Nome', quantidade: 999 }, req);
            expect(result.nome).toBe('Novo Nome');
            expect(repositoryMock.atualizar).toHaveBeenCalledWith('comp1', { nome: 'Novo Nome' }, req);
        });
        it('deve lançar erro se componente não existir', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.atualizar('compX', { nome: 'Qualquer' }, req))
                .rejects.toThrow(CustomError);
        });
        it('deve lançar erro se tentar atualizar para nome já existente', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            repositoryMock.buscarPorNome.mockResolvedValue(makeComponente({ _id: 'comp2', nome: 'Duplicado' }));
            await expect(service.atualizar('comp1', { nome: 'Duplicado' }, req))
                .rejects.toThrow(CustomError);
        });
        it('deve lançar erro inesperado do repository', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            repositoryMock.atualizar.mockRejectedValue(new Error('DB error'));
            await expect(service.atualizar('comp1', { nome: 'Novo' }, req)).rejects.toThrow('DB error');
        });
    });

    describe('inativar', () => {
        it('deve inativar componente existente', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            repositoryMock.atualizar.mockResolvedValue({ nome: 'Componente', ativo: false });
            const result = await service.inativar('comp1', req);
            expect(result).toHaveProperty('ativo', false);
        });
        it('deve lançar erro se componente não existir', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.inativar('compX', req)).rejects.toThrow(CustomError);
        });
        it('deve lançar erro inesperado do repository', async () => {
            const req = { user_id: 'user1' };
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            repositoryMock.atualizar.mockRejectedValue(new Error('DB error'));
            await expect(service.inativar('comp1', req)).rejects.toThrow('DB error');
        });
    });

    describe('Métodos auxiliares', () => {
        it('validateNome lança erro se nome já existir', async () => {
            repositoryMock.buscarPorNome.mockResolvedValue(makeComponente());
            await expect(service.validateNome('Resistor')).rejects.toThrow(CustomError);
        });
        it('validateNome não lança erro se nome for único', async () => {
            repositoryMock.buscarPorNome.mockResolvedValue(null);
            await expect(service.validateNome('Unico')).resolves.toBeUndefined();
        });
        it('ensureComponentExists lança erro se não existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(null);
            await expect(service.ensureComponentExists('compX')).rejects.toThrow(CustomError);
        });
        it('ensureComponentExists retorna componente se existir', async () => {
            repositoryMock.buscarPorId.mockResolvedValue(makeComponente());
            await expect(service.ensureComponentExists('comp1')).resolves.toHaveProperty('_id', 'comp1');
        });

        it('validateCategoria lança erro se não existir', async () => {
            CategoriaModel.findOne.mockResolvedValue(null);
            await expect(service.validateCategoria('catX', { user_id: 'user1' })).rejects.toThrow(CustomError);
        });
        it('validateCategoria não lança erro se existir', async () => {
            CategoriaModel.findOne.mockResolvedValue(makeCategoria());
            await expect(service.validateCategoria('cat1', { user_id: 'user1' })).resolves.toBeUndefined();
        });
    });
});