import UsuarioModel, { type UsuarioDocument } from '../usuario/UsuarioModel.js';
import RotaModel, { type RotaDocument } from '../rota/RotaModel.js';
import { CustomError, messages } from '../../utils/helpers/index.js';
import type mongoose from 'mongoose';

class AuthRepository {
  private model: mongoose.PaginateModel<UsuarioDocument>;
  private rotaModel: mongoose.PaginateModel<RotaDocument>;

  constructor({
    usuarioModel = UsuarioModel,
    rotaModel = RotaModel,
  }: {
    usuarioModel?: mongoose.PaginateModel<UsuarioDocument>;
    rotaModel?: mongoose.PaginateModel<RotaDocument>;
  } = {}) {
    this.model = usuarioModel;
    this.rotaModel = rotaModel;
  }

  async armazenarTokens(id: string, accesstoken: string, refreshtoken: string) {
    const documento = await this.model.findById(id);
    if (!documento) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }

    documento.accesstoken = accesstoken;
    documento.refreshtoken = refreshtoken;

    return await documento.save();
  }

  async removeToken(id: string) {
    const parsedData = {
      accesstoken: null,
      refreshtoken: null,
    };

    const usuario = await this.model
      .findByIdAndUpdate(id, parsedData as mongoose.UpdateQuery<UsuarioDocument>, { new: true })
      .lean();
    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        errorType: 'resourceNotFound',
        field: 'Usuário',
        details: [],
        customMessage: messages.error.resourceNotFound('Usuário'),
      });
    }
    return usuario;
  }
}

export default AuthRepository;
