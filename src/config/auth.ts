import type { Db, MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins';
import EmailService from '../utils/services/EmailService.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null;

export function initAuth(): ReturnType<typeof betterAuth> {
  const db = mongoose.connection.db as unknown as Db;
  const client = mongoose.connection.getClient() as unknown as MongoClient;

  _auth = betterAuth({
    database: mongodbAdapter(db, { client }),
    baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3010',
    secret: process.env['BETTER_AUTH_SECRET'] ?? '',
    trustedOrigins: [process.env['FRONTEND_URL'] ?? 'http://localhost:3000'],

    emailAndPassword: {
      enabled: true,
      resetPasswordTokenExpiresIn: 60 * 60 * 24,
      async sendResetPassword({ user, token }: { user: Record<string, unknown>; token: string }) {
        if (user['ativo'] === false) {
          await EmailService.enviarEmailConvite(
            user['name'] as string,
            user['email'] as string,
            token,
          );
        } else {
          await EmailService.enviarEmailRecuperacaoSenha(
            user['name'] as string,
            user['email'] as string,
            token,
          );
        }
      },
    },

    user: {
      modelName: 'usuarios',
      fields: { name: 'nome' },
      additionalFields: {
        ativo: { type: 'boolean', defaultValue: false, required: false },
        fotoPerfil: { type: 'string', required: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },

    plugins: [bearer()],
  });

  return _auth as ReturnType<typeof betterAuth>;
}

export function getAuth(): ReturnType<typeof betterAuth> {
  if (!_auth) throw new Error('Better Auth não inicializado. Chame initAuth() primeiro.');
  return _auth as ReturnType<typeof betterAuth>;
}
