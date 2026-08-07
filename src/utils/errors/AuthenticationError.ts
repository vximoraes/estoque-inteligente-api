class AuthenticationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 498;
    this.isOperational = true;
  }
}

export default AuthenticationError;
