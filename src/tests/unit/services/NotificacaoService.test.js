import NotificacaoService from '../../../services/NotificacaoService.js';
import NotificacaoRepository from '../../../repositories/NotificacaoRepository.js';
import { CustomError } from '../../../utils/helpers/index.js';

describe('NotificacaoService', () => {
    let service;
    let repository;

    beforeEach(() => {
        repository = {
            listar: jest.fn(),
            buscarPorId: jest.fn(),
            criar: jest.fn(),
            marcarComoVisualizada: jest.fn()
        };
        service = new NotificacaoService();
        service.repository = repository;
    });

    it('deve listar todas as notificações', async () => {
        const mockData = [{ mensagem: 'Teste' }];
        repository.listar.mockResolvedValue(mockData);
        const result = await service.listarTodas({});
        expect(result).toBe(mockData);
        expect(repository.listar).toHaveBeenCalled();
    });

    it('deve buscar notificação por id', async () => {
        const mockData = { mensagem: 'Teste' };
        repository.buscarPorId.mockResolvedValue(mockData);
        const req = { user_id: 'user123' };
        const result = await service.buscarPorId('id123', req);
        expect(result).toBe(mockData);
        expect(repository.buscarPorId).toHaveBeenCalledWith('id123', 'user123');
    });

    it('deve criar notificação com dados válidos', async () => {
        const mockData = { mensagem: 'Nova', usuario: 'user123' };
        repository.criar.mockResolvedValue(mockData);
        const req = { user_id: 'user123' };
        const result = await service.criar({ mensagem: 'Nova' }, req);
        expect(result).toBe(mockData);
        expect(repository.criar).toHaveBeenCalledWith({ mensagem: 'Nova', usuario: 'user123' });
    });

    it('deve marcar notificação como visualizada', async () => {
        const mockData = { visualizada: true };
        repository.marcarComoVisualizada.mockResolvedValue(mockData);
        const req = { user_id: 'user123' };
        const result = await service.marcarComoVisualizada('id123', req);
        expect(result).toBe(mockData);
        expect(repository.marcarComoVisualizada).toHaveBeenCalledWith('id123', 'user123');
    });

    it('deve lançar erro ao tentar cadastrar notificação com usuário inexistente', async () => {
        const customError = new CustomError({ statusCode: 400, customMessage: 'Usuário informado não existe.' });
        repository.criar.mockRejectedValue(customError);
        const req = { user_id: 'user123' };
        await expect(service.criar({ mensagem: 'Teste', usuario: 'invalido' }, req)).rejects.toThrow('Usuário informado não existe.');
    });

    it('deve lançar erro ao tentar buscar notificação inexistente', async () => {
        const customError = new CustomError({ statusCode: 404, customMessage: 'Notificação não encontrada' });
        repository.buscarPorId.mockRejectedValue(customError);
        const req = { user_id: 'user123' };
        await expect(service.buscarPorId('id_inexistente', req)).rejects.toThrow('Notificação não encontrada');
    });

    it('deve lançar erro ao tentar atualizar notificação inexistente', async () => {
        const customError = new CustomError({ statusCode: 404, customMessage: 'Notificação não encontrada' });
        repository.marcarComoVisualizada.mockRejectedValue(customError);
        const req = { user_id: 'user123' };
        await expect(service.marcarComoVisualizada('id_inexistente', req)).rejects.toThrow('Notificação não encontrada');
    });

    it('deve lançar erro do repository em qualquer operação', async () => {
        const error = new Error('Falha inesperada');
        repository.listar.mockRejectedValue(error);
        await expect(service.listarTodas({})).rejects.toThrow('Falha inesperada');
    });
});