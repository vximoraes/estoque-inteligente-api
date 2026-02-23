import OrcamentoController from '../../../controllers/OrcamentoController.js';
import { CommonResponse } from '../../../utils/helpers/index.js';
import Item from '../../../models/Item.js';
import Fornecedor from '../../../models/Fornecedor.js';

jest.mock('../../../services/OrcamentoService.js', () => {
    return jest.fn().mockImplementation(() => ({
        criar: jest.fn(),
        listar: jest.fn(),
        atualizar: jest.fn(),
        deletar: jest.fn(),
        adicionarItem: jest.fn(),
        atualizarItem: jest.fn(),
        removerItem: jest.fn(),
        getItemById: jest.fn(),
    }));
});

jest.mock('../../../models/Item.js', () => ({
    findById: jest.fn()
}));

jest.mock('../../../models/Fornecedor.js', () => ({
    findById: jest.fn()
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('OrcamentoController', () => {
    let controller, service, res;

    beforeEach(() => {
        controller = new OrcamentoController();
        service = controller.service;
        res = mockRes();
        jest.clearAllMocks();
        
        Item.findById.mockImplementation((id) => {
            if (id === '507f1f77bcf86cd799439012') return Promise.resolve({ _id: id, nome: 'Resistor' });
            if (id === '507f1f77bcf86cd799439014') return Promise.resolve({ _id: id, nome: 'Capacitor' });
            return Promise.resolve(null);
        });
        
        Fornecedor.findById.mockImplementation((id) => {
            if (id === '507f1f77bcf86cd799439013' || id === '507f1f77bcf86cd799439015') {
                return Promise.resolve({ _id: id, nome: 'Fornecedor Teste' });
            }
            return Promise.resolve(null);
        });
    });

    describe('criar', () => {
        it('deve criar orçamento válido e retornar 201', async () => {
            const req = {
                body: {
                    nome: 'Orçamento Teste',
                    itens: [
                        { item: '507f1f77bcf86cd799439012', fornecedor: '507f1f77bcf86cd799439013', quantidade: '2', valor_unitario: '1.5' },
                        { item: '507f1f77bcf86cd799439014', fornecedor: '507f1f77bcf86cd799439015', quantidade: '1', valor_unitario: '2' }
                    ]
                }
            };
            const fakeOrcamento = {
                toObject: () => ({ _id: '507f1f77bcf86cd799439011', valor: 5, ...req.body })
            };
            service.criar.mockResolvedValue(fakeOrcamento);
            await controller.criar(req, res);
            expect(service.criar).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nome: 'Orçamento Teste' }) }));
        });

        it('deve retornar erro 400 para dados inválidos', async () => {
            const req = { body: { nome: '', itens: [] } };
            await expect(controller.criar(req, res)).rejects.toThrow();
        });
    });

    describe('listar', () => {
        it('deve retornar todos os orçamentos', async () => {
            const req = { params: {}, query: {} };
            service.listar.mockResolvedValue([{ nome: 'Orçamento 1' }]);
            await controller.listar(req, res);
            expect(service.listar).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Array) }));
        });
    });

    describe('atualizar', () => {
        it('deve atualizar orçamento existente', async () => {
            const req = { params: { id: '507f1f77bcf86cd799439011' }, body: { nome: 'Novo Nome' } };
            service.atualizar.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', nome: 'Novo Nome' });
            await controller.atualizar(req, res);
            expect(service.atualizar).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { nome: 'Novo Nome' }, req);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('sucesso') }));
        });
        it('deve retornar erro 404 para orçamento inexistente', async () => {
            const req = { params: { id: '507f1f77bcf86cd799439011' }, body: { nome: 'Novo Nome' } };
            service.atualizar.mockRejectedValue({ status: 404 });
            await expect(controller.atualizar(req, res)).rejects.toBeDefined();
        });
    });

    describe('deletar', () => {
        it('deve deletar orçamento existente', async () => {
            const req = { params: { id: '507f1f77bcf86cd799439011' } };
            service.deletar.mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });
            await controller.deletar(req, res);
            expect(service.deletar).toHaveBeenCalledWith('507f1f77bcf86cd799439011', req);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('excluído') }));
        });
        it('deve retornar erro 404 para orçamento inexistente', async () => {
            const req = { params: { id: '507f1f77bcf86cd799439011' } };
            service.deletar.mockRejectedValue({ status: 404 });
            await expect(controller.deletar(req, res)).rejects.toBeDefined();
        });
    });

    describe('adicionarItem', () => {
        it('deve adicionar item válido', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011' }, body: { item: '507f1f77bcf86cd799439012', fornecedor: '507f1f77bcf86cd799439013', quantidade: '2', valor_unitario: '1.5' } };
            service.adicionarItem.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', item_orcamento: [{ nome: 'Resistor' }] });
            await controller.adicionarItem(req, res);
            expect(service.adicionarItem).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('adicionado') }));
        });
        it('deve retornar erro 400 para dados inválidos', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011' }, body: { item: '', quantidade: '0', fornecedor: '' } };
            await expect(controller.adicionarItem(req, res)).rejects.toThrow();
        });
    });

    describe('atualizarItem', () => {
        it('deve atualizar item existente', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439012' }, body: { quantidade: '5' } };
            service.getItemById.mockResolvedValue({ _id: '507f1f77bcf86cd799439012', nome: 'Resistor', quantidade: '2', valor_unitario: '1.5' });
            service.atualizarItem.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', item_orcamento: [{ _id: '507f1f77bcf86cd799439012', quantidade: '5' }] });
            await controller.atualizarItem(req, res);
            expect(service.atualizarItem).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('atualizado') }));
        });
        it('deve retornar erro 404 para item inexistente', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439012' }, body: { quantidade: '5' } };
            service.getItemById.mockResolvedValue(null);
            await controller.atualizarItem(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 404, error: true, message: expect.any(String) }));
            expect(res.json.mock.calls[0][0].errors[0].message).toMatch(/item/i);
        });
        it('deve retornar erro 400 se nenhum campo enviado', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011', id: '507f1f77bcf86cd799439012' }, body: {} };
            await controller.atualizarItem(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 400, error: true, message: expect.any(String) }));
            expect(res.json.mock.calls[0][0].errors[0].message).toMatch(/nenhum campo/i);
        });
    });

    describe('removerItem', () => {
        it('deve remover item existente', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011', id: 'cid' } };
            service.removerItem.mockResolvedValue({ _id: '507f1f77bcf86cd799439011', item_orcamento: [] });
            await controller.removerItem(req, res);
            expect(service.removerItem).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'cid', req);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('removido') }));
        });
        it('deve retornar erro 404 para item inexistente', async () => {
            const req = { params: { orcamentoId: '507f1f77bcf86cd799439011', id: 'cid' } };
            service.removerItem.mockRejectedValue({ status: 404 });
            await expect(controller.removerItem(req, res)).rejects.toBeDefined();
        });
    });

    describe('falha inesperada', () => {
        it('deve retornar erro 500 para falha inesperada', async () => {
            const req = { params: {}, body: {} };
            service.listar.mockRejectedValue(new Error('Erro inesperado'));
            await expect(controller.listar(req, res)).rejects.toThrow('Erro inesperado');
        });
    });
});
