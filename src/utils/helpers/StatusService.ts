import HttpStatusCodes, { type HttpStatus } from './HttpStatusCodes.js';
import messages from './messages.js';

class StatusService {
  static getHttpCodeMessage(code: number): string {
    const status = (Object.values(HttpStatusCodes) as HttpStatus[]).find(
      (s) => s.code === code,
    );
    return status ? status.message : 'Status desconhecido.';
  }

  static getErrorMessage(type: string, field?: string | null): string {
    const errorMessages = messages.error as unknown as Record<string, unknown>;
    const entry = errorMessages[type];
    if (entry !== undefined) {
      if (typeof entry === 'function') {
        return (entry as (arg?: string) => string)(field ?? undefined);
      }
      return entry as string;
    }
    return 'Tipo de erro desconhecido.';
  }
}

export default StatusService;
