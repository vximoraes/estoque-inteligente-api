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

  describe('modelos de e-mail', () => {
    const emprestimo = {
      tipo_controle: 'unidade',
      patrimonio: { numero_patrimonio: 'PAT-9', modelo: 'Notebook <b>X</b>' },
      localizacao: { nome: 'Lab 1' },
      solicitante_nome: 'Ana <script>',
      quantidade_emprestada: 1,
      quantidade_aberta: 1,
      data_saida: '2026-10-20T13:00:00Z',
      data_prevista_devolucao: '2026-10-21T13:00:00Z',
      observacoes_emprestimo: 'Levar carregador',
    };

    function ultimoEnvio() {
      return mockSendMail.mock.calls.at(-1)![0] as {
        to: string;
        subject: string;
        text: string;
        html: string;
      };
    }

    beforeEach(() => {
      mockSendMail.mockResolvedValue({ messageId: 'm' });
    });

    it('convite e recuperação levam o link com o token', async () => {
      process.env.FRONTEND_URL = 'https://app.teste';
      const EmailService = await importEmailService();

      await EmailService.enviarEmailConvite('Ana', 'ana@t.com', 'tk1');
      expect(ultimoEnvio().to).toBe('ana@t.com');
      expect(ultimoEnvio().text).toContain(
        'https://app.teste/ativar-conta?token=tk1',
      );

      await EmailService.enviarEmailRecuperacaoSenha('Ana', 'ana@t.com', 'tk2');
      expect(ultimoEnvio().text).toContain(
        'https://app.teste/redefinir-senha?token=tk2',
      );
    });

    it('novo empréstimo identifica o patrimônio, usa o fuso e escapa o HTML', async () => {
      const EmailService = await importEmailService();
      await EmailService.enviarEmailNovoEmprestimo(
        'Resp',
        'resp@t.com',
        emprestimo,
        'America/Porto_Velho',
      );

      const envio = ultimoEnvio();
      expect(envio.subject).toContain('Notebook <b>X</b> (patrimônio PAT-9)');
      expect(envio.text).toContain('20/10/2026, 09:00 (UTC-04:00)');
      expect(envio.html).toContain('Ana &lt;script&gt;');
      expect(envio.html).not.toContain('<script>');
      expect(envio.text).toContain('Observações: Levar carregador');
    });

    it('devolução distingue parcial de total', async () => {
      const EmailService = await importEmailService();

      await EmailService.enviarEmailDevolucaoEmprestimo(
        'Resp',
        'resp@t.com',
        { ...emprestimo, quantidade_aberta: 1 },
        1,
      );
      expect(ultimoEnvio().subject).toMatch(/^Devolução parcial/);

      await EmailService.enviarEmailDevolucaoEmprestimo(
        'Resp',
        'resp@t.com',
        { ...emprestimo, quantidade_aberta: 0 },
        1,
      );
      expect(ultimoEnvio().subject).toMatch(/^Empréstimo devolvido/);
    });

    it('atraso informa a data prevista e cai no nome genérico sem item', async () => {
      const EmailService = await importEmailService();
      await EmailService.enviarEmailEmprestimoAtrasado(
        'Resp',
        'resp@t.com',
        { ...emprestimo, tipo_controle: 'quantidade', item: undefined },
        'UTC',
      );

      const envio = ultimoEnvio();
      expect(envio.subject).toBe('Empréstimo em atraso — Item desconhecido');
      expect(envio.text).toContain('21/10/2026, 13:00 (UTC+00:00)');
    });
  });
});
