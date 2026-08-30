import type { Request, Response } from 'express';
import CommonResponse from '../utils/helpers/CommonResponse.js';
import HttpStatusCodes from '../utils/helpers/HttpStatusCodes.js';

function bloquearAutocadastroMiddleware(_req: Request, res: Response): void {
  CommonResponse.error(
    res,
    HttpStatusCodes.FORBIDDEN.code,
    'forbidden',
    null,
    [],
    'Autocadastro desabilitado. Solicite um convite ao administrador.',
  );
}

export default bloquearAutocadastroMiddleware;
