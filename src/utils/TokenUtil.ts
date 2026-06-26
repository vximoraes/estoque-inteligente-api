import jwt from 'jsonwebtoken';

class TokenUtil {
  generateAccessToken(id: string | unknown): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { id },
        process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '',
        { expiresIn: (process.env['JWT_ACCESS_TOKEN_EXPIRATION'] ?? '15m') as jwt.SignOptions['expiresIn'] },
        (err, token) => {
          if (err) return reject(err);
          resolve(token as string);
        },
      );
    });
  }

  generateRefreshToken(id: string | unknown): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { id },
        process.env['JWT_SECRET_REFRESH_TOKEN'] ?? '',
        { expiresIn: (process.env['JWT_REFRESH_TOKEN_EXPIRATION'] ?? '7d') as jwt.SignOptions['expiresIn'] },
        (err, token) => {
          if (err) return reject(err);
          resolve(token as string);
        },
      );
    });
  }

  generatePasswordRecoveryToken(id: string | unknown): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { id },
        process.env['JWT_SECRET_PASSWORD_RECOVERY'] ?? '',
        { expiresIn: (process.env['JWT_PASSWORD_RECOVERY_EXPIRATION'] ?? '5m') as jwt.SignOptions['expiresIn'] },
        (err, token) => {
          if (err) return reject(err);
          resolve(token as string);
        },
      );
    });
  }

  decodeAccessToken(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '', (err, decoded) => {
        if (err) return reject(err);
        resolve((decoded as jwt.JwtPayload)['id'] as string);
      });
    });
  }

  decodeRefreshToken(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env['JWT_SECRET_REFRESH_TOKEN'] ?? '', (err, decoded) => {
        if (err) return reject(err);
        resolve((decoded as jwt.JwtPayload)['id'] as string);
      });
    });
  }

  decodePasswordRecoveryToken(
    token: string,
    key: string = process.env['JWT_SECRET_PASSWORD_RECOVERY'] ?? '',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, key, (err, decoded) => {
        if (err) return reject(err);
        resolve((decoded as jwt.JwtPayload)['id'] as string);
      });
    });
  }

  generateInviteToken(email: string): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { email },
        process.env['JWT_SECRET_INVITE'] ?? process.env['JWT_SECRET_PASSWORD_RECOVERY'] ?? '',
        { expiresIn: '5m' },
        (err, token) => {
          if (err) return reject(err);
          resolve(token as string);
        },
      );
    });
  }

  decodeInviteToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        process.env['JWT_SECRET_INVITE'] ?? process.env['JWT_SECRET_PASSWORD_RECOVERY'] ?? '',
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as jwt.JwtPayload);
        },
      );
    });
  }
}

export default new TokenUtil();
