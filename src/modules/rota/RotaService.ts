import RotaRepository from './RotaRepository.js';
import { CustomError, HttpStatusCodes, messages } from '../../utils/helpers/index.js';
import type { Rota, RotaUpdate } from './RotaSchema.js';
import type { AuthenticatedRequest } from '../../utils/types.js';

class RotaService {
  private repository: RotaRepository;

  constructor() {
    this.repository = new RotaRepository();
  }

  async listar(req: AuthenticatedRequest) {
    return await this.repository.listar(req);
  }

  async criar(parsedData: Rota) {
    console.log('Estou no criar em RotaService');
    const rota = await this.repository.buscarRotaPorNome(parsedData.rota);
    if (rota) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: 'resourceConflict',
        field: 'Rotas',
        details: [],
        customMessage: messages.error.resourceConflict('Rotas', 'rotas duplicadas'),
      });
    }
    return await this.repository.criar(parsedData as unknown as Record<string, unknown>);
  }

  async atualizar(parsedData: RotaUpdate, id: string) {
    const rota = await this.repository.buscarRotaPorNome(parsedData.rota, id);
    if (rota) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: 'resourceConflict',
        field: 'Rotas',
        details: [],
        customMessage: messages.error.resourceConflict('Rotas', 'rotas duplicadas'),
      });
    }
    return await this.repository.atualizar(parsedData as Record<string, unknown>, id);
  }

  async deletar(req: AuthenticatedRequest, id: string) {
    const rota = await this.repository.buscarPorId(id);
    const rotaAtual = (req.route as { path: string }).path.replace(/\//g, '');
    if (rotaAtual === rota.rota || rotaAtual.includes(rota.rota)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: 'forbidden',
        field: 'Rotas',
        details: [],
        customMessage: messages.error.forbidden('Não pode deletar a rota atual'),
      });
    }
    return await this.repository.deletar(id);
  }
}

export default RotaService;
