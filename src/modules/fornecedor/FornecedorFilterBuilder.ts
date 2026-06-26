import type mongoose from 'mongoose';
import FornecedorModel, { type IFornecedor } from './FornecedorModel.js';
import FornecedorRepository from './FornecedorRepository.js';

type FornecedorFilter = mongoose.FilterQuery<IFornecedor>;

class FornecedorFilterBuilder {
  private filtros: FornecedorFilter = {};
  fornecedorRepository: FornecedorRepository;
  fornecedorModel: typeof FornecedorModel;

  constructor() {
    this.fornecedorRepository = new FornecedorRepository();
    this.fornecedorModel = FornecedorModel;
  }

  comNome(nome: string | null | undefined): this {
    if (nome !== undefined && nome !== null && nome !== '') {
      this.filtros.nome = { $regex: nome, $options: 'i' };
    }
    return this;
  }

  comContato(contato: string | null | undefined): this {
    if (contato !== undefined && contato !== null && contato !== '') {
      this.filtros.contato = { $regex: contato, $options: 'i' };
    }
    return this;
  }

  comDescricao(descricao: string | null | undefined): this {
    if (descricao !== undefined && descricao !== null && descricao !== '') {
      this.filtros.descricao = { $regex: descricao, $options: 'i' };
    }
    return this;
  }

  comUrl(url: string | null | undefined): this {
    if (url !== undefined && url !== null && url !== '') {
      this.filtros.url = { $regex: url, $options: 'i' };
    }
    return this;
  }

  build(): FornecedorFilter {
    return this.filtros;
  }
}

export default FornecedorFilterBuilder;
