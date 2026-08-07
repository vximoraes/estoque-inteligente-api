import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import type { Request } from 'express';

dotenv.config();

interface EmailInfo {
  to: string | undefined;
  subject: string;
  text: string;
  html: string;
}

class SendMail {
  static async enviaEmail(infoemail: EmailInfo) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env['EMAIL_HOST'],
        port: Number(process.env['EMAIL_PORT']),
        secure: process.env['EMAIL_SECURE'] === 'true',
        auth: {
          user: process.env['EMAIL_USER'],
          pass: process.env['EMAIL_PASS'],
        },
      });

      const hashId = () => crypto.randomBytes(6).toString('hex');

      await transporter.sendMail({
        from: process.env['EMAIL_USER'],
        to: infoemail.to,
        subject: `${infoemail.subject} Email: #${hashId()}`,
        text: infoemail.text,
        html: infoemail.html,
      });
    } catch {
      return { error: true, code: 500, message: 'Erro interno do Servidor' };
    }
  }

  static async enviaEmailError(err: Error, pathname: string, date: Date, req: Request) {
    const infoEmail: EmailInfo = {
      to: process.env['ADMIN_EMAIL'],
      subject: `Erro interno do servidor na classe: ${pathname}`,
      text: `Erro Detectado \n\nErro interno do Servidor\n\nAtenciosamente,\nEquipe de suporte\n\nErro: ${err.message}\n\nArquivo: ${pathname}\n\nData e Hora: ${date}`,
      html: `<p>Olá,</p><p>Erro interno do Servidor</p><p>Atenciosamente,</p><p>Equipe de suporte</p><p>Erro: ${err.message}</p><p>Arquivo: ${pathname}</p><p>Data e Hora: ${date}</p><p>Requisição: ${req.method}</p><p>URL: ${req.protocol}://${req.get('host')}${req.originalUrl}</p>`,
    };

    await this.enviaEmail(infoEmail);
  }

  static async enviaEmailErrorDbConect(err: Error, pathname: string, date: Date) {
    const infoEmail: EmailInfo = {
      to: process.env['ADMIN_EMAIL'],
      subject: `Erro interno do servidor na classe: ${pathname}`,
      text: `Erro Detectado \n\nErro interno do Servidor\n\nAtenciosamente,\nEquipe de suporte\n\nErro: ${err.message}\n\nArquivo: ${pathname}\n\nData e Hora: ${date}`,
      html: `<p>Olá,</p><p>Erro interno do Servidor</p><p>Atenciosamente,</p><p>Equipe de suporte</p><p>Erro: ${err.message}</p><p>Arquivo: ${pathname}</p><p>Data e Hora: ${date}</p>`,
    };

    await this.enviaEmail(infoEmail);
  }
}

export default SendMail;
