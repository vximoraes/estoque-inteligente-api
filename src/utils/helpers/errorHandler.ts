import type { NextFunction, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../logger.js';
import CommonResponse from './CommonResponse.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import AuthenticationError from '../errors/AuthenticationError.js';
import CustomError from './CustomError.js';
import type { AuthenticatedRequest } from '../types.js';

type MongoError = Error & {
  code?: number;
  keyValue?: Record<string, string>;
};

type OperationalError = Error & {
  isOperational?: boolean;
  statusCode?: number;
  errorType?: string;
  field?: string | null;
  details?: unknown[];
  customMessage?: string | null;
};

const errorHandler = (
  err: Error | CustomError | MongoError | OperationalError,
  req: AuthenticatedRequest,
  res: Response,
  _next: NextFunction,
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errorId = uuidv4();
  const requestId = req.requestId ?? 'N/A';

  if (err instanceof ZodError) {
    logger.warn(
      { errors: err.errors, path: req.path, requestId },
      'Erro de validação',
    );
    CommonResponse.error(
      res,
      400,
      'validationError',
      null,
      err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      `Erro de validação. ${err.errors.length} campo(s) inválido(s).`,
    );
    return;
  }

  const mongoErr = err as MongoError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0];
    const value = mongoErr.keyValue ? mongoErr.keyValue[field!] : 'duplicado';
    logger.warn(
      { field, value, path: req.path, requestId },
      'Erro de chave duplicada',
    );
    CommonResponse.error(
      res,
      409,
      'duplicateEntry',
      field,
      [{ path: field, message: `O valor "${value}" já está em uso.` }],
      `Entrada duplicada no campo "${field}".`,
    );
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const detalhes = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    logger.warn(
      { details: detalhes, path: req.path, requestId },
      'Erro de validação do Mongoose',
    );
    CommonResponse.error(res, 400, 'validationError', null, detalhes);
    return;
  }

  if (err instanceof AuthenticationError) {
    logger.warn(
      { message: err.message, path: req.path, requestId },
      'Erro de autenticação',
    );
    CommonResponse.error(
      res,
      err.statusCode,
      'authenticationError',
      null,
      [{ message: err.message }],
      err.message,
    );
    return;
  }

  if (err instanceof CustomError && err.errorType === 'tokenExpired') {
    logger.warn(
      { message: err.message, path: req.path, requestId },
      'Erro de token expirado',
    );
    CommonResponse.error(
      res,
      err.statusCode || 401,
      'tokenExpired',
      null,
      [{ message: err.customMessage || 'Token expirado.' }],
      err.customMessage || 'Token expirado. Por favor, faça login novamente.',
    );
    return;
  }

  const opErr = err as OperationalError;
  if (opErr.isOperational) {
    logger.warn(
      { message: err.message, path: req.path, requestId },
      'Erro operacional',
    );
    CommonResponse.error(
      res,
      opErr.statusCode!,
      opErr.errorType || 'operationalError',
      opErr.field ?? null,
      opErr.details ?? [],
      opErr.customMessage ?? 'Erro operacional.',
    );
    return;
  }

  logger.error(
    { message: err.message, stack: err.stack, requestId },
    `Erro interno [ID: ${errorId}]`,
  );
  const detalhes = isProduction
    ? [{ message: `Erro interno do servidor. Referência: ${errorId}` }]
    : [{ message: err.message, stack: err.stack }];

  CommonResponse.error(res, 500, 'serverError', null, detalhes);
};

export default errorHandler;
