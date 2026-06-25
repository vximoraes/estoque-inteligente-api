import UsuarioModel from './UsuarioModel.js';
import UsuarioRepository from './UsuarioRepository.js';
import type mongoose from 'mongoose';
import type { IUsuario } from './UsuarioModel.js';

type UsuarioFilter = mongoose.FilterQuery<IUsuario>;

class UsuarioFilterBuilder {
  filtros: UsuarioFilter = {};
  usuarioRepository: UsuarioRepository;
  usuarioModel: typeof UsuarioModel;

  constructor() {
    this.filtros = {};
    this.usuarioRepository = new UsuarioRepository();
    this.usuarioModel = UsuarioModel;
  }

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros['nome'] = { $regex: nome, $options: 'i' };
    }
    return this;
  }

  comEmail(email: string | null | undefined): this {
    if (email) {
      this.filtros['email'] = { $regex: email, $options: 'i' };
    }
    return this;
  }

  comAtivo(ativo = 'true'): this {
    if (ativo === 'true') {
      this.filtros['ativo'] = true;
    }
    if (ativo === 'false') {
      this.filtros['ativo'] = false;
    }
    return this;
  }

  escapeRegex(texto: string): string {
    return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  build(): UsuarioFilter {
    return this.filtros;
  }
}

export default UsuarioFilterBuilder;
