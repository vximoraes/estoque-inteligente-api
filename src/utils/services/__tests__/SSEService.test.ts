import SSEService from '../SSEService.js';

function makeRes() {
  const handlers = {};
  return {
    write: jest.fn(),
    on: jest.fn((event, cb) => {
      handlers[event] = cb;
    }),
    emit(event) {
      handlers[event]?.();
    },
  };
}

describe('SSEService', () => {
  beforeEach(() => {
    // limpa clientes conectados entre testes (instância é um singleton)
    while (SSEService.getConnectedClientsCount() > 0) {
      const [[userId, clients]] = SSEService['clients'].entries();
      clients.forEach((res) => SSEService.removeClient(userId, res));
    }
  });

  describe('addClient', () => {
    it('deve registrar um cliente para o usuário', () => {
      const res = makeRes();
      SSEService.addClient('user1', res);
      expect(SSEService.getConnectedClientsCount()).toBe(1);
    });

    it('deve registrar múltiplos clientes para o mesmo usuário', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      SSEService.addClient('user1', res1);
      SSEService.addClient('user1', res2);
      expect(SSEService.getConnectedClientsCount()).toBe(2);
    });

    it('deve aceitar userId com toString (ex.: ObjectId)', () => {
      const res = makeRes();
      SSEService.addClient({ toString: () => 'user1' }, res);
      expect(SSEService.getConnectedClientsCount()).toBe(1);
    });

    it('deve remover o cliente automaticamente quando a conexão fechar', () => {
      const res = makeRes();
      SSEService.addClient('user1', res);
      res.emit('close');
      expect(SSEService.getConnectedClientsCount()).toBe(0);
    });
  });

  describe('removeClient', () => {
    it('deve remover um cliente específico sem afetar os demais', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      SSEService.addClient('user1', res1);
      SSEService.addClient('user1', res2);
      SSEService.removeClient('user1', res1);
      expect(SSEService.getConnectedClientsCount()).toBe(1);
    });

    it('não deve lançar erro ao remover cliente de usuário inexistente', () => {
      const res = makeRes();
      expect(() => SSEService.removeClient('inexistente', res)).not.toThrow();
    });
  });

  describe('sendToUser', () => {
    it('deve escrever evento formatado em todos os clientes do usuário', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      SSEService.addClient('user1', res1);
      SSEService.addClient('user1', res2);

      SSEService.sendToUser('user1', 'atualizacao', { foo: 'bar' });

      const mensagemEsperada = 'event: atualizacao\ndata: {"foo":"bar"}\n\n';
      expect(res1.write).toHaveBeenCalledWith(mensagemEsperada);
      expect(res2.write).toHaveBeenCalledWith(mensagemEsperada);
    });

    it('não deve lançar erro quando usuário não tem clientes conectados', () => {
      expect(() =>
        SSEService.sendToUser('semclientes', 'evento', {}),
      ).not.toThrow();
    });

    it('não deve propagar erro se write falhar em um cliente', () => {
      const res = makeRes();
      res.write.mockImplementation(() => {
        throw new Error('conexão fechada');
      });
      SSEService.addClient('user1', res);
      expect(() => SSEService.sendToUser('user1', 'evento', {})).not.toThrow();
    });
  });

  describe('sendNotification', () => {
    it('deve enviar evento do tipo "notificacao"', () => {
      const res = makeRes();
      SSEService.addClient('user1', res);
      SSEService.sendNotification('user1', { titulo: 'Oi' });
      expect(res.write).toHaveBeenCalledWith(
        'event: notificacao\ndata: {"titulo":"Oi"}\n\n',
      );
    });
  });

  describe('getConnectedClientsCount', () => {
    it('deve somar clientes de todos os usuários', () => {
      SSEService.addClient('user1', makeRes());
      SSEService.addClient('user2', makeRes());
      SSEService.addClient('user2', makeRes());
      expect(SSEService.getConnectedClientsCount()).toBe(3);
    });
  });
});
