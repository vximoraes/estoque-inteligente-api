export interface CustomErrorOptions {
  statusCode?: number;
  errorType?: string;
  field?: string | null;
  details?: unknown[];
  customMessage?: string | null;
}

class CustomError extends Error {
  statusCode: number | undefined;
  errorType: string | undefined;
  field: string | null;
  details: unknown[];
  customMessage: string | null;
  isOperational: boolean;

  constructor({
    statusCode,
    errorType,
    field = null,
    details = [],
    customMessage = null,
  }: CustomErrorOptions = {}) {
    super(customMessage || 'An error occurred');
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.field = field ?? null;
    this.details = details;
    this.customMessage = customMessage ?? null;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default CustomError;
