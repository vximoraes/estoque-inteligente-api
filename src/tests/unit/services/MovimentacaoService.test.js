import MovimentacaoService from '../../../services/MovimentacaoService.js';
import MovimentacaoRepository from '../../../repositories/MovimentacaoRepository.js';
import Componente from '../../../models/Componente.js';
import Fornecedor from '../../../models/Fornecedor.js';
import Estoque from '../../../models/Estoque.js';
import { CustomError } from '../../../utils/helpers/index.js';
import mongoose from 'mongoose';

jest.mock('../../../repositories/MovimentacaoRepository.js');
jest.mock('../../../models/Componente.js');
jest.mock('../../../models/Fornecedor.js');
jest.mock('../../../models/Estoque.js');

const makeComponente = (props = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    quantidade: 10,
    save: jest.fn().mockResolvedValue(undefined),
    ...props
});
const makeFornecedor = (props = {}) => ({ _id: new mongoose.Types.ObjectId(), ...props });
const makeMovimentacao = (props = {}) => ({ _id: new mongoose.Types.ObjectId(), ...props });
const makeEstoque = (props = {}) => ({ componente: new mongoose.Types.ObjectId(), localizacao: new mongoose.Types.ObjectId(), quantidade: 10, ...props });

describe('MovimentacaoService', () => {
    let service, repositoryMock;
    beforeEach(() => {
        MovimentacaoRepository.mockClear();
        repositoryMock = {
            criar: jest.fn(),
            listar: jest.fn()
        };
        MovimentacaoRepository.mockImplementation(() => repositoryMock);
        service = new MovimentacaoService();
        jest.clearAllMocks();
    });

    describe('criar', () => {
        it('deve cadastrar movimentação de entrada com sucesso', async () => {
            const componente = makeComponente();
            const parsedData = {
                componente: componente._id,
                tipo: 'entrada',
                quantidade: 5
            };
            const req = { user_id: 'user123' };
            Componente.findOne.mockResolvedValue(componente);
            repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

            const result = await service.criar({ ...parsedData }, req);
            expect(repositoryMock.criar).toHaveBeenCalled();
        });

        it('deve cadastrar movimentação de saída com sucesso (sem fornecedor)', async () => {
            const componente = makeComponente({ quantidade: 10 });
            const localizacao = new mongoose.Types.ObjectId();
            const parsedData = {
                componente: componente._id,
                tipo: 'saida',
                quantidade: 3,
                localizacao: localizacao
            };
            const req = { user_id: 'user123' };
            
            // Mock do Estoque
            Estoque.findOne.mockResolvedValue(makeEstoque({ quantidade: 10 }));
            
            Componente.findOne.mockResolvedValue(componente);
            repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

            const result = await service.criar({ ...parsedData }, req);
            expect(repositoryMock.criar).toHaveBeenCalled();
        });

        it('deve lançar erro se componente não existir', async () => {
            const req = { user_id: 'user123' };
            Componente.findOne.mockResolvedValue(null);
            await expect(service.criar({ componente: new mongoose.Types.ObjectId(), tipo: 'entrada', quantidade: 1 }, req))
                .rejects.toThrow(CustomError);
        });

        it('deve lançar erro se quantidade insuficiente na saída', async () => {
            const componente = makeComponente({ quantidade: 2 });
            const localizacao = new mongoose.Types.ObjectId();
            const parsedData = {
                componente: componente._id,
                tipo: 'saida',
                quantidade: 5,
                localizacao: localizacao
            };
            const req = { user_id: 'user123' };
            
            // Mock do Estoque com quantidade insuficiente
            Estoque.findOne.mockResolvedValue(makeEstoque({ quantidade: 2 }));
            
            Componente.findOne.mockResolvedValue(componente);
            await expect(service.criar(parsedData, req))
                .rejects.toThrow(CustomError);
        });        it('deve lidar corretamente com tipo diferente de entrada/saida', async () => {
            const componente = makeComponente({ quantidade: 10 });
            const parsedData = {
                componente: componente._id,
                tipo: 'outro',  
                quantidade: 5
            };
            const req = { user_id: 'user123' };
            Componente.findOne.mockResolvedValue(componente);
            repositoryMock.criar.mockResolvedValue(makeMovimentacao(parsedData));

            const result = await service.criar({ ...parsedData }, req);
            
            expect(repositoryMock.criar).toHaveBeenCalled();
        });
    });

    describe('listar', () => {
        it('deve retornar todas as movimentações', async () => {
            const req = {};
            const movs = [makeMovimentacao(), makeMovimentacao({ _id: 'mov2' })];
            repositoryMock.listar.mockResolvedValue(movs);
            const result = await service.listar(req);
            expect(result).toEqual(movs);
        });

        it('deve lançar erro inesperado do repository', async () => {
            repositoryMock.listar.mockRejectedValue(new Error('DB error'));
            await expect(service.listar({})).rejects.toThrow('DB error');
        });
    });
});