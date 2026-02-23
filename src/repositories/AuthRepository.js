import UsuarioModel from '../models/Usuario.js';
import RotaModel from '../models/Rota.js';
import { CustomError, messages } from '../utils/helpers/index.js';

class AuthRepository {
  constructor({ usuarioModel = UsuarioModel, rotaModel = RotaModel } = {}) {
    this.model = usuarioModel;
    this.rotaModel = rotaModel;
  }

  async armazenarTokens(id, accesstoken, refreshtoken) {
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

    const data = await documento.save();
    return data;
  }

  async removeToken(id) {
    const parsedData = {
      accesstoken: null,
      refreshtoken: null,
    };

    const usuario = await this.model
      .findByIdAndUpdate(id, parsedData, { new: true })
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
