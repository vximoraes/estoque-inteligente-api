import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

class AuthHelper {
  static generateToken(userId: string): string {
    return jwt.sign({ id: userId }, process.env['JWT_SECRET'] ?? '', {
      expiresIn: '1h',
    });
  }

  static decodeToken(token: string): jwt.JwtPayload | string | null {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}

export default AuthHelper;
