import multer from 'multer';
import path from 'path';
import { CustomError, HttpStatusCodes } from '../utils/helpers/index.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    try {
      const extensao = path.extname(file.originalname).toLowerCase();
      const extensoesPermitidas = ['.jpg', '.jpeg', '.png'];
      const mimeTypesPermitidos = ['image/jpeg', 'image/png'];

      if (!extensoesPermitidas.includes(extensao)) {
        return cb(
          new CustomError({
            statusCode: HttpStatusCodes.BAD_REQUEST.code,
            errorType: 'unsupportedMediaType',
            field: 'Imagem',
            details: [{ path: 'Imagem', message: 'Extensão inválida' }],
            customMessage: 'Extensão de arquivo inválido.',
          }),
        );
      }
      if (!mimeTypesPermitidos.includes(file.mimetype)) {
        return cb(
          new CustomError({
            statusCode: HttpStatusCodes.BAD_REQUEST.code,
            errorType: 'unsupportedMediaType',
            field: 'Imagem',
            details: [{ path: 'Imagem', message: 'Arquivo inválido' }],
            customMessage: 'O arquivo enviado não é uma imagem válida.',
          }),
        );
      }
      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  },
});

export default upload;
