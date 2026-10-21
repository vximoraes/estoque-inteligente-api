jest.mock('../ConversaModel.js', () => {
  const actual = jest.requireActual('../ConversaModel.js');
  return {
    __esModule: true,
    MAX_MENSAGENS: actual.MAX_MENSAGENS,
    default: {
      create: jest.fn(),
      paginate: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest.fn(),
    },
  };
});
jest.mock('../IALimites.js', () => ({
  iniciarStream: jest.fn(),
  finalizarStream: jest.fn(),
}));
jest.mock('../IAService.js', () => ({
  processarMensagem: jest.fn(),
  contemVazamentoDoPrompt: jest.fn().mockReturnValue(false),
}));
jest.mock('../IAObservabilidade.js', () => ({
  comTrace: jest.fn((_contexto, fn) => fn(jest.fn())),
}));
jest.mock('../IAUsoService.js', () => ({
  registrarUso: jest.fn(),
  derivarTokens: jest.fn(() => ({
    tokensPensamento: 0,
    tokensSaidaFaturavel: 0,
  })),
  calcularCustoDetalhado: jest.fn(),
}));

import IAController from '../IAController.js';
import ConversaModel, { MAX_MENSAGENS } from '../ConversaModel.js';
import { iniciarStream } from '../IALimites.js';
import { processarMensagem } from '../IAService.js';

describe('IAController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      user_id: 'user1',
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe('criarConversa', () => {
    it('deve criar conversa com título padrão quando sem mensagem inicial', async () => {
      const conversaCriada = {
        toObject: () => ({ _id: 'c1', titulo: 'Nova conversa' }),
      };
      ConversaModel.create.mockResolvedValue(conversaCriada);

      await IAController.criarConversa(req, res);

      expect(ConversaModel.create).toHaveBeenCalledWith({
        usuario: 'user1',
        titulo: 'Nova conversa',
      });
    });

    it('deve usar o início da mensagem inicial como título', async () => {
      req.body = { mensagem_inicial: 'Quantos itens tenho em estoque hoje?' };
      const conversaCriada = {
        toObject: () => ({ _id: 'c1' }),
      };
      ConversaModel.create.mockResolvedValue(conversaCriada);

      await IAController.criarConversa(req, res);

      expect(ConversaModel.create).toHaveBeenCalledWith({
        usuario: 'user1',
        titulo: 'Quantos itens tenho em estoque hoje?',
      });
    });
  });

  describe('listarConversas', () => {
    it('deve paginar conversas do usuário autenticado', async () => {
      ConversaModel.paginate.mockResolvedValue({ docs: [] });

      await IAController.listarConversas(req, res);

      expect(ConversaModel.paginate).toHaveBeenCalledWith(
        { usuario: 'user1' },
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('obterConversa', () => {
    it('deve retornar conversa existente do usuário', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const conversa = {
        toObject: () => ({ _id: '507f1f77bcf86cd799439011' }),
      };
      ConversaModel.findOne.mockResolvedValue(conversa);

      await IAController.obterConversa(req, res);

      expect(ConversaModel.findOne).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
        usuario: 'user1',
      });
    });

    it('deve lançar 404 quando conversa não existe', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      ConversaModel.findOne.mockResolvedValue(null);

      await expect(IAController.obterConversa(req, res)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deletarConversa', () => {
    it('deve deletar conversa existente e responder 204', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      ConversaModel.findOneAndDelete.mockResolvedValue({ _id: '1' });

      await IAController.deletarConversa(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('deve lançar 404 quando conversa a deletar não existe', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      ConversaModel.findOneAndDelete.mockResolvedValue(null);

      await expect(
        IAController.deletarConversa(req, res),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('enviarMensagem — validações antes do stream', () => {
    const idValido = '507f1f77bcf86cd799439011';

    it('deve lançar 404 quando conversa não existe', async () => {
      req.params = { id: idValido };
      req.body = { content: 'Olá' };
      ConversaModel.findOne.mockResolvedValue(null);

      await expect(IAController.enviarMensagem(req, res)).rejects.toMatchObject(
        { statusCode: 404 },
      );
    });

    it('deve lançar 422 quando a conversa atingiu o limite de mensagens', async () => {
      req.params = { id: idValido };
      req.body = { content: 'Olá' };
      ConversaModel.findOne.mockResolvedValue({
        mensagens: new Array(MAX_MENSAGENS - 1).fill({
          role: 'user',
          content: 'x',
        }),
      });

      await expect(IAController.enviarMensagem(req, res)).rejects.toMatchObject(
        { statusCode: 422 },
      );
    });

    it('deve lançar 429 quando o usuário já tem consulta em andamento', async () => {
      req.params = { id: idValido };
      req.body = { content: 'Olá' };
      ConversaModel.findOne.mockResolvedValue({ mensagens: [] });
      iniciarStream.mockReturnValue(false);

      await expect(IAController.enviarMensagem(req, res)).rejects.toMatchObject(
        { statusCode: 429 },
      );
    });

    it('deve lançar erro de validação quando content está vazio', async () => {
      req.params = { id: idValido };
      req.body = { content: '' };

      await expect(IAController.enviarMensagem(req, res)).rejects.toThrow();
    });
  });

  describe('enviarMensagem — persistência após falha', () => {
    const idValido = '507f1f77bcf86cd799439011';

    function prepararStream(eventos, erro) {
      req.params = { id: idValido };
      req.body = { content: 'Quantos itens tenho?' };
      res = {
        ...res,
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const conversa = {
        mensagens: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      ConversaModel.findOne.mockResolvedValue(conversa);
      iniciarStream.mockReturnValue(true);
      processarMensagem.mockResolvedValue(
        (async function* () {
          yield* eventos;
          throw erro;
        })(),
      );
      return conversa;
    }

    it('não salva a pergunta quando a IA falha antes de responder', async () => {
      const conversa = prepararStream([], new Error('503'));

      await IAController.enviarMensagem(req, res);

      expect(conversa.mensagens).toEqual([]);
      expect(conversa.save).toHaveBeenCalled();
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"'),
      );
    });

    it('salva pergunta e resposta parcial quando a falha vem depois do texto', async () => {
      const conversa = prepararStream(
        [
          {
            event: 'on_chat_model_stream',
            data: { chunk: { content: 'Você tem ' } },
          },
        ],
        new Error('corte'),
      );

      await IAController.enviarMensagem(req, res);

      expect(conversa.mensagens.map((m) => m.role)).toEqual([
        'user',
        'assistant',
      ]);
    });
  });
});
