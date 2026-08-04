import ConversaModel, { MAX_MENSAGENS } from './ConversaModel.js';
import { processarMensagem } from './IAService.js';
import { CustomError, CommonResponse } from '../../utils/helpers/index.js';
import logger from '../../utils/logger.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../utils/types.js';

const MAX_CONTENT_LENGTH = 2000;

function sanitizarEntrada(raw: unknown): string {
  return String(raw)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}

class IAController {
  async criarConversa(req: AuthenticatedRequest, res: Response) {
    const usuarioId = req.user_id;
    const body = req.body as Record<string, unknown> | undefined;
    const mensagem_inicial = body?.['mensagem_inicial'];

    const titulo = mensagem_inicial
      ? String(mensagem_inicial).trim().slice(0, 60)
      : 'Nova conversa';

    const conversa = await ConversaModel.create({ usuario: usuarioId, titulo });

    return CommonResponse.created(res, conversa.toObject());
  }

  async listarConversas(req: AuthenticatedRequest, res: Response) {
    const usuarioId = req.user_id;
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1')) || 1);
    const limit = Math.min(
      parseInt(String(req.query['limite'] ?? '20')) || 20,
      50,
    );

    const resultado = await ConversaModel.paginate(
      { usuario: usuarioId },
      {
        page,
        limit,
        select: '_id titulo atualizada_em criada_em',
        sort: { atualizada_em: -1 },
      },
    );

    return CommonResponse.success(res, resultado);
  }

  async obterConversa(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'];
    const usuarioId = req.user_id;

    const conversa = await ConversaModel.findOne({
      _id: id,
      usuario: usuarioId,
    });

    if (!conversa) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Conversa',
        details: [],
        customMessage: 'Conversa não encontrada.',
      });
    }

    return CommonResponse.success(res, conversa.toObject());
  }

  async deletarConversa(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'];
    const usuarioId = req.user_id;

    const conversa = await ConversaModel.findOneAndDelete({
      _id: id,
      usuario: usuarioId,
    });

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

  async enviarMensagem(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'];
    const usuarioId = req.user_id;
    const body = req.body as Record<string, unknown> | undefined;
    const content = body?.['content'];

    if (!content || !String(content).trim()) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'content',
        details: [],
        customMessage: 'O campo content é obrigatório.',
      });
    }

    if (String(content).trim().length > MAX_CONTENT_LENGTH) {
      throw new CustomError({
        statusCode: 400,
        errorType: 'validationError',
        field: 'content',
        details: [],
        customMessage: `A mensagem não pode ultrapassar ${MAX_CONTENT_LENGTH} caracteres.`,
      });
    }

    const mensagemSanitizada = sanitizarEntrada(content);

    const conversa = await ConversaModel.findOne({
      _id: id,
      usuario: usuarioId,
    });

    if (!conversa) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Conversa',
        details: [],
        customMessage: 'Conversa não encontrada.',
      });
    }

    if (conversa.mensagens.length >= MAX_MENSAGENS - 1) {
      throw new CustomError({
        statusCode: 422,
        errorType: 'validationError',
        field: 'mensagens',
        details: [],
        customMessage: `Esta conversa atingiu o limite de ${MAX_MENSAGENS} mensagens. Inicie uma nova conversa.`,
      });
    }

    const cookie = req.headers.cookie;

    conversa.mensagens.push({ role: 'user', content: mensagemSanitizada });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let respostaCompleta = '';

    try {
      const stream = await processarMensagem(
        conversa,
        mensagemSanitizada,
        cookie,
      );

      for await (const event of stream) {
        const evt = event as { event?: string; data?: Record<string, unknown> };
        if (evt.event === 'on_chat_model_stream') {
          const chunk_data = evt.data?.['chunk'] as
            | Record<string, unknown>
            | undefined;
          const raw = chunk_data?.['content'];
          let chunk = '';
          if (typeof raw === 'string') {
            chunk = raw;
          } else if (Array.isArray(raw)) {
            chunk = (raw as Array<Record<string, unknown>>)
              .filter((p) => p?.['type'] === 'text')
              .map((p) => String(p['text'] ?? ''))
              .join('');
          }
          if (chunk) {
            respostaCompleta += chunk;
            res.write(
              `data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`,
            );
          }
        }
      }

      conversa.mensagens.push({ role: 'assistant', content: respostaCompleta });
      await conversa.save();

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      const error = err as Error;
      logger.error(
        { message: error?.message, stack: error?.stack },
        'Erro no agente IA:',
      );
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Não foi possível processar sua mensagem. Tente novamente.' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}

export default new IAController();
