import CustomError from '../helpers/CustomError.js';
import messages from '../helpers/messages.js';

class TokenInvalidError extends CustomError {
  constructor(_message?: string) {
    super({
      statusCode: 401,
      errorType: 'invalidToken',
      field: 'Token',
      details: [],
      customMessage: messages.error.resourceNotFound('Token'),
    });
  }
}

export default TokenInvalidError;
