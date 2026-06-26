class TokenExpiredError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
    this.statusCode = 498;
    this.isOperational = true;
  }
}

export default TokenExpiredError;
