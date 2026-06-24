import GrupoService from './GrupoService.js';
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
} from '../../utils/helpers/index.js';
import {
  GrupoQuerySchema,
  GrupoIdSchema,
} from './GrupoQuerySchema.js';
import {
  GrupoSchema,
  GrupoUpdateSchema,
} from './GrupoSchema.js';
import ObjectIdSchema from '../../shared/utils/ObjectIdSchema.js';

class GrupoController {
  constructor() {
    this.service = new GrupoService();
  }

  async listar(req, res) {
    const { id } = req.params || null;
    if (id) {
      GrupoIdSchema.parse(id);
    }

    const query = req.query || {};
    if (Object.keys(query).length !== 0) {
      const validatedQuery = GrupoQuerySchema.parse(req.query);
    }

    const data = await this.service.listar(req);
    return CommonResponse.success(res, data);
  }

  async criar(req, res) {
    const parsedData = GrupoSchema.parse(req.body);
    const data = await this.service.criar(parsedData);
    return CommonResponse.created(res, data);
  }

  async atualizar(req, res) {
    const { id } = req.params || null;
    if (id) {
      GrupoIdSchema.parse(id);
    }

    const parsedData = GrupoUpdateSchema.parse(req.body);
    const data = await this.service.atualizar(parsedData, id, req.user);
    return CommonResponse.success(res, data);
  }

  async deletar(req, res) {
    const { id } = req.params || null;
    GrupoIdSchema.parse(id);
    if (!id) {
      throw new CustomError(
        'ID do grupo é obrigatório para deletar.',
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const data = await this.service.deletar(id, req.user);
    return CommonResponse.success(res, data, 200, 'Grupo excluído com sucesso.');
  }

  async adicionarRota(req, res) {
    const { id } = req.params;
    const { idRota } = req.body;
    GrupoIdSchema.parse(id);
    ObjectIdSchema.parse(idRota);

    const data = await this.service.adicionarRota(id, idRota);
    return CommonResponse.success(res, data, 200, 'Rota Adicionada com sucesso.');
  }
}

export default GrupoController;
