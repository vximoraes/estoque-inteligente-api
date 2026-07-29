import CategoriaModel from './CategoriaModel.js';
import CategoriaRepository from './CategoriaRepository.js';
import { escapeRegex } from '../../utils/helpers/escapeRegex.js';

class CategoriaFilterBuilder {
  filtros: Record<string, unknown> = {};
  categoriaRepository: CategoriaRepository;
  categoriaModel: typeof CategoriaModel;

  constructor() {
    this.filtros = {};
    this.categoriaRepository = new CategoriaRepository();
    this.categoriaModel = CategoriaModel;
  }

  comNome(nome: string | null | undefined): this {
    if (nome) {
      this.filtros['nome'] = { $regex: escapeRegex(nome), $options: 'i' };
    }
    return this;
  }

  build(): Record<string, unknown> {
    return this.filtros;
  }
}

export default CategoriaFilterBuilder;
