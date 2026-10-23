import EmprestimoModel from '../EmprestimoModel.js';
import EmailService from '../../../utils/services/EmailService.js';
import { verificarEmprestimosAtrasados } from '../EmprestimoAtrasadoJob.js';

jest.mock('../EmprestimoModel.js', () => ({
  __esModule: true,
  default: { find: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('../../../utils/services/EmailService.js', () => ({
  __esModule: true,
  default: { enviarEmailEmprestimoAtrasado: jest.fn() },
}));

function prepararAtrasados(emprestimos) {
  const consulta = {
    populate: jest.fn(() => consulta),
    then: (resolver) => resolver(emprestimos),
  };
  EmprestimoModel.find.mockReturnValue(consulta);
}

describe('verificarEmprestimosAtrasados', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marca o aviso como enviado só depois de enviar o e-mail', async () => {
    prepararAtrasados([
      { _id: 'e1', solicitante_nome: 'Ana', solicitante_email: 'ana@x.com' },
    ]);
    EmailService.enviarEmailEmprestimoAtrasado.mockResolvedValue({
      success: true,
    });

    await verificarEmprestimosAtrasados();

    expect(EmprestimoModel.updateOne).toHaveBeenCalledWith(
      { _id: 'e1' },
      { email_atraso_enviado: true },
    );
  });

  it('não marca quando o envio falha, para tentar de novo no próximo ciclo', async () => {
    prepararAtrasados([
      { _id: 'e2', solicitante_nome: 'Bia', solicitante_email: 'bia@x.com' },
    ]);
    EmailService.enviarEmailEmprestimoAtrasado.mockRejectedValue(
      new Error('SMTP fora'),
    );

    await verificarEmprestimosAtrasados();

    expect(EmprestimoModel.updateOne).not.toHaveBeenCalled();
  });

  it('marca sem enviar quando o empréstimo não tem e-mail do solicitante', async () => {
    prepararAtrasados([{ _id: 'e3', solicitante_nome: 'Caio' }]);

    await verificarEmprestimosAtrasados();

    expect(EmailService.enviarEmailEmprestimoAtrasado).not.toHaveBeenCalled();
    expect(EmprestimoModel.updateOne).toHaveBeenCalledTimes(1);
  });
});
