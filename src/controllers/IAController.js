import ConversaModel, { MAX_MENSAGENS } from '../models/Conversa.js';
import { processarMensagem } from '../services/IAService.js';
import { CustomError } from '../utils/helpers/index.js';
import logger from '../utils/logger.js';

class IAController {
  async criarConversa(req, res) {
    const usuarioId = req.user_id;
    const { mensagem_inicial } = req.body ?? {};

    const titulo = mensagem_inicial
      ? String(mensagem_inicial).trim().slice(0, 60)
      : 'Nova conversa';

    const conversa = await ConversaModel.create({
      usuario: usuarioId,
      titulo,
    });

    return res.status(201).json({ data: conversa });
  }

  async listarConversas(req, res) {
    const usuarioId = req.user_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limite) || 20, 50);

    const resultado = await ConversaModel.paginate(
      { usuario: usuarioId },
      {
        page,
        limit,
        select: '_id titulo atualizada_em criada_em',
        sort: { atualizada_em: -1 },
      },
    );

    return res.status(200).json({ data: resultado });
  }

  async obterConversa(req, res) {
    const { id } = req.params;
    const usuarioId = req.user_id;

    const conversa = await ConversaModel.findOne({ _id: id, usuario: usuarioId });

    if (!conversa) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Conversa',
        details: [],
        customMessage: 'Conversa não encontrada.',
      });
    }

    return res.status(200).json({ data: conversa });
  }

  async deletarConversa(req, res) {
    const { id } = req.params;
    const usuarioId = req.user_id;

    const conversa = await ConversaModel.findOneAndDelete({ _id: id, usuario: usuarioId });

    if (!conversa) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Conversa',
        details: [],
        customMessage: 'Conversa não encontrada.',
      });
    }

    return res.status(204).send();
  }

  async enviarMensagem(req, res) {
    const { id } = req.params;
    const usuarioId = req.user_id;
    const { content } = req.body ?? {};

    if (!content || !String(content).trim()) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'content',
        details: [],
        customMessage: 'O campo content é obrigatório.',
      });
    }

    const conversa = await ConversaModel.findOne({ _id: id, usuario: usuarioId });

    if (!conversa) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Conversa',
        details: [],
        customMessage: 'Conversa não encontrada.',
      });
    }

    if (conversa.mensagens.length >= MAX_MENSAGENS) {
      throw new CustomError({
        statusCode: 422,
        errorType: 'validationError',
        field: 'mensagens',
        details: [],
        customMessage: `Esta conversa atingiu o limite de ${MAX_MENSAGENS} mensagens. Inicie uma nova conversa.`,
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] ?? authHeader;

    conversa.mensagens.push({ role: 'user', content: String(content).trim() });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let respostaCompleta = '';

    try {
      const stream = await processarMensagem(conversa, String(content).trim(), token);

      for await (const event of stream) {
        if (event.event === 'on_chat_model_stream') {
          const raw = event.data?.chunk?.content;
          let chunk = '';
          if (typeof raw === 'string') {
            chunk = raw;
          } else if (Array.isArray(raw)) {
            chunk = raw
              .filter((p) => p?.type === 'text')
              .map((p) => p.text ?? '')
              .join('');
          }
          if (chunk) {
            respostaCompleta += chunk;
            res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
          }
        }
      }

      conversa.mensagens.push({ role: 'assistant', content: respostaCompleta });
      await conversa.save();

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      logger.error('Erro no agente IA:', { message: err?.message, stack: err?.stack });
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Não foi possível processar sua mensagem. Tente novamente.' })}\n\n`);
    } finally {
      res.end();
    }
  }
}

export default new IAController();
