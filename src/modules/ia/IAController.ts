import { GraphRecursionError } from '@langchain/langgraph';
import ConversaModel, { MAX_MENSAGENS } from './ConversaModel.js';
import { processarMensagem, contemVazamentoDoPrompt } from './IAService.js';
import {
  TIMEOUT_MS,
  MODELO,
  ORCAMENTO_TOKENS_DIA,
  MAX_CONVERSAS_POR_USUARIO,
} from './IAConfig.js';
import {
  registrarUso,
  tokensUsadosHoje,
  derivarTokens,
  calcularCustoDetalhado,
} from './IAUsoService.js';
import { comTrace } from './IAObservabilidade.js';
import { iniciarStream, finalizarStream } from './IALimites.js';
import { EnviarMensagemSchema, CriarConversaSchema } from './IASchema.js';
import {
  ConversaIdSchema,
  ListarConversasQuerySchema,
} from './IAQuerySchema.js';
import type { FinalizadoPor } from './IAUsoModel.js';
import { CustomError, CommonResponse } from '../../utils/helpers/index.js';
import logger from '../../utils/logger.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../utils/types.js';

class IAController {
  async criarConversa(req: AuthenticatedRequest, res: Response) {
    const usuarioId = req.user_id;
    const { mensagem_inicial } = CriarConversaSchema.parse(req.body ?? {});

    const totalConversas = await ConversaModel.countDocuments({
      usuario: usuarioId,
    });
    if (totalConversas >= MAX_CONVERSAS_POR_USUARIO) {
      throw new CustomError({
        statusCode: 422,
        errorType: 'validationError',
        field: 'conversas',
        details: [],
        customMessage: `Você atingiu o limite de ${MAX_CONVERSAS_POR_USUARIO} conversas. Exclua alguma para criar outra.`,
      });
    }

    const titulo = mensagem_inicial
      ? mensagem_inicial.slice(0, 60)
      : 'Nova conversa';

    const conversa = await ConversaModel.create({ usuario: usuarioId, titulo });

    return CommonResponse.created(res, conversa.toObject());
  }

  async listarConversas(req: AuthenticatedRequest, res: Response) {
    const usuarioId = req.user_id;
    const { page, limite } = ListarConversasQuerySchema.parse(req.query ?? {});

    const resultado = await ConversaModel.paginate(
      { usuario: usuarioId },
      {
        page,
        limit: limite,
        select: '_id titulo atualizada_em criada_em',
        sort: { atualizada_em: -1 },
      },
    );

    return CommonResponse.success(res, resultado);
  }

  async obterConversa(req: AuthenticatedRequest, res: Response) {
    const id = req.params['id'] as string;
    ConversaIdSchema.parse(id);
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
    const id = req.params['id'] as string;
    ConversaIdSchema.parse(id);
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
    const id = req.params['id'] as string;
    ConversaIdSchema.parse(id);
    const usuarioId = req.user_id;
    const { content: mensagemSanitizada } = EnviarMensagemSchema.parse(
      req.body ?? {},
    );

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

    if ((await tokensUsadosHoje(usuarioId as string)) >= ORCAMENTO_TOKENS_DIA) {
      throw new CustomError({
        statusCode: 429,
        errorType: 'rateLimit',
        field: 'ia',
        details: [],
        customMessage:
          'Você atingiu o limite diário de uso do assistente. Tente novamente amanhã.',
      });
    }

    if (!iniciarStream(usuarioId as string)) {
      throw new CustomError({
        statusCode: 429,
        errorType: 'rateLimit',
        field: 'ia',
        details: [],
        customMessage: 'Você já tem uma consulta em andamento.',
      });
    }

    const cookie = req.headers.cookie;

    conversa.mensagens.push({ role: 'user', content: mensagemSanitizada });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const abortCliente = new AbortController();
    res.on('close', () => abortCliente.abort(new Error('cliente_desconectou')));
    const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
    const signal = AbortSignal.any([timeoutSignal, abortCliente.signal]);

    let respostaCompleta = '';
    let erroOcorrido: Error | null = null;
    const inicioMs = Date.now();
    const uso = {
      tokensEntrada: 0,
      tokensSaida: 0,
      tokensTotais: 0,
      tokensCacheLeitura: 0,
      passosLlm: 0,
      ferramentasChamadas: 0,
      ferramentas: [] as string[],
    };
    const inicioFerramentas = new Map<string, number>();

    await comTrace(
      { usuarioId: usuarioId as string, conversaId: id as string },
      async (registrarCusto) => {
        try {
          const stream = await processarMensagem(
            conversa,
            mensagemSanitizada,
            cookie,
            signal,
          );

          for await (const event of stream) {
            const evt = event as {
              event?: string;
              name?: string;
              run_id?: string;
              data?: Record<string, unknown>;
            };
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
            } else if (evt.event === 'on_chat_model_end') {
              const output = evt.data?.['output'] as
                | {
                    usage_metadata?: {
                      input_tokens?: number;
                      output_tokens?: number;
                      total_tokens?: number;
                      input_token_details?: { cache_read?: number };
                    };
                  }
                | undefined;
              const usage = output?.usage_metadata;
              if (usage) {
                uso.tokensEntrada += usage.input_tokens ?? 0;
                uso.tokensSaida += usage.output_tokens ?? 0;
                uso.tokensTotais += usage.total_tokens ?? 0;
                uso.tokensCacheLeitura +=
                  usage.input_token_details?.cache_read ?? 0;
                uso.passosLlm += 1;
              }
            } else if (evt.event === 'on_tool_start') {
              if (evt.run_id) inicioFerramentas.set(evt.run_id, Date.now());
            } else if (
              evt.event === 'on_tool_end' ||
              evt.event === 'on_tool_error'
            ) {
              const nome = evt.name ?? 'desconhecida';
              const inicio = evt.run_id
                ? inicioFerramentas.get(evt.run_id)
                : undefined;
              if (evt.run_id) inicioFerramentas.delete(evt.run_id);

              if (evt.event === 'on_tool_end') {
                uso.ferramentasChamadas += 1;
                uso.ferramentas.push(nome);
              }

              logger.info(
                {
                  usuario: usuarioId,
                  conversa: id,
                  ferramenta: nome,
                  duracaoFerramentaMs: inicio ? Date.now() - inicio : null,
                  sucesso: evt.event === 'on_tool_end',
                },
                'IA: tool MCP chamada',
              );
            }
          }

          if (contemVazamentoDoPrompt(respostaCompleta)) {
            logger.warn(
              { usuario: usuarioId, conversa: id },
              'IA: possível vazamento de system prompt detectado, resposta redigida antes de persistir',
            );
            respostaCompleta =
              '**Fora do meu escopo.** Sou especializado apenas em consultas do estoque. Posso ajudar com itens, movimentações, empréstimos ou orçamentos?';
          }

          conversa.mensagens.push({
            role: 'assistant',
            content: respostaCompleta,
          });
          await conversa.save();

          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        } catch (err) {
          erroOcorrido = err as Error;
          logger.error(
            { message: erroOcorrido?.message, stack: erroOcorrido?.stack },
            'Erro no agente IA:',
          );

          if (respostaCompleta) {
            conversa.mensagens.push({
              role: 'assistant',
              content: respostaCompleta,
            });
          }
          await conversa.save().catch((saveErr: Error) => {
            logger.error(
              { message: saveErr?.message },
              'Erro ao salvar conversa após falha do agente IA:',
            );
          });

          if (!abortCliente.signal.aborted) {
            const mensagemErro = timeoutSignal.aborted
              ? 'A consulta demorou demais e foi interrompida.'
              : erroOcorrido instanceof GraphRecursionError
                ? 'A consulta ficou complexa demais. Tente ser mais específico.'
                : 'Não foi possível processar sua mensagem. Tente novamente.';

            res.write(
              `data: ${JSON.stringify({ type: 'error', message: mensagemErro })}\n\n`,
            );
          }
        } finally {
          const finalizadoPor: FinalizadoPor = abortCliente.signal.aborted
            ? 'cancelado'
            : timeoutSignal.aborted
              ? 'tempo_esgotado'
              : erroOcorrido instanceof GraphRecursionError
                ? 'limite_passos'
                : erroOcorrido
                  ? 'erro'
                  : 'concluido';

          const { tokensPensamento, tokensSaidaFaturavel } = derivarTokens(
            uso.tokensEntrada,
            uso.tokensSaida,
            uso.tokensTotais,
          );

          registrarCusto({
            model: MODELO,
            usageDetails: {
              input: uso.tokensEntrada,
              output: uso.tokensSaida,
              output_reasoning: tokensPensamento,
              total: uso.tokensTotais,
            },
            costDetails: calcularCustoDetalhado(
              MODELO,
              uso.tokensEntrada,
              tokensSaidaFaturavel,
            ),
          });

          await registrarUso({
            usuarioId: usuarioId as string,
            conversaId: id as string,
            modelo: MODELO,
            tokensEntrada: uso.tokensEntrada,
            tokensSaida: uso.tokensSaida,
            tokensTotais: uso.tokensTotais,
            tokensCacheLeitura: uso.tokensCacheLeitura,
            passosLlm: uso.passosLlm,
            ferramentasChamadas: uso.ferramentasChamadas,
            ferramentas: uso.ferramentas,
            duracaoMs: Date.now() - inicioMs,
            finalizadoPor,
          });

          finalizarStream(usuarioId as string);
          res.end();
        }
      },
    );
  }
}

export default new IAController();
