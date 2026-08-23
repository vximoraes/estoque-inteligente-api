import { jest } from '@jest/globals';

const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify,
}));

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: mockCreateTransport },
}));

const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };

jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: mockLogger,
}));

async function importEmailService() {
  const mod = await import('../EmailService.js');
  return mod.default;
}

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockVerify.mockResolvedValue(undefined);
    process.env = {
      ...originalEnv,
      EMAIL_USER: 'app@teste.com',
      EMAIL_APP_PASSWORD: 'senha',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('não inicializa transporter e loga warn quando faltam as env vars', async () => {
    process.env.EMAIL_USER = '';
    process.env.EMAIL_APP_PASSWORD = '';

    const EmailService = await importEmailService();

    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('EMAIL_USER e EMAIL_APP_PASSWORD'),
    );

    await expect(
      EmailService.enviarEmail('a@a.com', 'assunto', 'texto'),
    ).rejects.toMatchObject({
      errorType: 'emailServiceUnavailable',
    });
  });

  it('loga erro e segue quando verify() falha na inicialização', async () => {
    mockVerify.mockRejectedValue(new Error('credencial inválida'));

    await importEmailService();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('Falha ao verificar conexão'),
    );
  });

  it('envia e-mail com sucesso na primeira tentativa', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    const EmailService = await importEmailService();
    const result = await EmailService.enviarEmail(
      'destino@teste.com',
      'assunto',
      'texto',
    );

    expect(result).toEqual({ success: true, messageId: 'msg-1' });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('tenta novamente em falha transitória e sucede antes do limite', async () => {
    jest.useFakeTimers();
    mockSendMail
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ messageId: 'msg-2' });

    const EmailService = await importEmailService();
    const promise = EmailService.enviarEmail(
      'destino@teste.com',
      'assunto',
      'texto',
    );

    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: true, messageId: 'msg-2' });
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tentativa: 1 }),
      expect.stringContaining('tentando novamente'),
    );
  });

  it('esgota tentativas e lança CustomError emailSendError', async () => {
    jest.useFakeTimers();
    mockSendMail.mockRejectedValue(new Error('smtp fora do ar'));

    const EmailService = await importEmailService();
    const promise = EmailService.enviarEmail(
      'destino@teste.com',
      'assunto',
      'texto',
    );

    const assertion = expect(promise).rejects.toMatchObject({
      errorType: 'emailSendError',
    });
    await jest.runAllTimersAsync();
    await assertion;

    expect(mockSendMail).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.stringContaining('após 3 tentativa(s)'),
    );
  });
});
