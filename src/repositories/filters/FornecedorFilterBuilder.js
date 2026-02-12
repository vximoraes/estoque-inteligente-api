import FornecedorModel from '../../models/Fornecedor.js';
import FornecedorRepository from '../FornecedorRepository.js';

class FornecedorFilterBuilder {
    constructor() {
        this.filtros = {};
        this.fornecedorRepository = new FornecedorRepository();
        this.fornecedorModel = FornecedorModel;
    };

    comNome(nome) {
        if (nome !== undefined && nome !== null && nome !== '') {
            this.filtros.nome = { $regex: nome, $options: 'i' };
        };
        return this;
    };

    comContato(contato) {
        if (contato !== undefined && contato !== null && contato !== '') {
            this.filtros.contato = { $regex: contato, $options: 'i' };
        };
        return this;
    };

    comDescricao(descricao) {
        if (descricao !== undefined && descricao !== null && descricao !== '') {
            this.filtros.descricao = { $regex: descricao, $options: 'i' };
        };
        return this;
    };

    comUrl(url) {
        if (url !== undefined && url !== null && url !== '') {
            this.filtros.url = { $regex: url, $options: 'i' };
        };
        return this;
    };

    build() {
        return this.filtros;
    };
};

export default FornecedorFilterBuilder;