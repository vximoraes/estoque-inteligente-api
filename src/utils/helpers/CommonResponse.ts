import type { Response } from 'express';
import StatusService from './StatusService.js';

class CommonResponse {
  error: boolean;
  code: number;
  message: string;
  data: unknown;
  errors: unknown[];

  constructor(
    error = false,
    code = 200,
    message = '',
    data: unknown = null,
    errors: unknown[] = [],
  ) {
    this.error = error;
    this.code = code;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  toJSON() {
    return {
      error: this.error,
      code: this.code,
      message: this.message,
      data: this.data,
      errors: this.errors,
    };
  }

  static success(res: Response, data: unknown, code = 200, message: string | null = null) {
    const statusMessage = message || StatusService.getHttpCodeMessage(code);
    const response = new CommonResponse(false, code, statusMessage, data, []);
    return res.status(code).json(response.toJSON());
  }

  static error(
    res: Response,
    code: number,
    errorType: string,
    field: string | null | undefined = null,
    errors: unknown[] = [],
    customMessage: string | null = null,
  ) {
    const errorMessage =
      customMessage || StatusService.getErrorMessage(errorType, field);
    const response = new CommonResponse(true, code, errorMessage, null, errors);
    return res.status(code).json(response.toJSON());
  }

  static created(res: Response, data: unknown, message: string | null = null) {
    return this.success(res, data, 201, message);
  }

  static serverError(res: Response, message: string | null = null) {
    const errorMessage =
      message || StatusService.getErrorMessage('serverError');
    const response = new CommonResponse(true, 500, errorMessage, null, []);
    return res.status(500).json(response.toJSON());
  }
}

export default CommonResponse;
