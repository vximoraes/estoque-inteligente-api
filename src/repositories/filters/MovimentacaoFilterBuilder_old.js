import MovimentacaoModel from '../../models/Movimentacao.js';
import MovimentacaoRep                    // Força a busca "vazia".
                    this.filtros.localizacao = { $in: [] };
                };
            };
        };
        return this;
    };

    build() {
        return this.filtros;
    };
}; '../MovimentacaoRepository.js';
import Item from '../../models/Item.js';
import Localizacao from '../../models/Localizacao.js';
import mongoose from 'mongoose';
const { Types } = mongoose;

class MovimentacaoFilterBuilder {
    constructor() {
        this.filtros = {};
        this.movimentacaoRepository = new MovimentacaoRepository();
        this.movimentacaoModel = MovimentacaoModel;
    };

    comTipo(tipo) {
        if (tipo) {
            this.filtros.tipo = { $regex: tipo, $options: 'i' };
        }
        return this;
    };

    comData(data) {
        if (data) {
            const inicio = new Date(data + "T00:00:00.000Z");
            const fim = new Date(data + "T23:59:59.999Z");
            this.filtros.data_hora = { $gte: inicio, $lte: fim };
        };
        return this;
    };

    comQuantidade(quantidade) {
        if (quantidade !== undefined && quantidade !== null && quantidade !== '') {
            const num = Number(quantidade);
            if (!isNaN(num)) {
                this.filtros.quantidade = num;
            };
        };
        return this;
    };

    async comItem(item) {
        if (item) {
            if (Types.ObjectId.isValid(item)) {
                // Se já for um ObjectId, faz o populate direto.
                this.filtros.item = item;
                const itemEncontrado = await Item.findById(item);
                if (!itemEncontrado) {
                    // Caso não exista, força a busca “vazia”.
                    this.filtros.item = { $in: [] };
                };
            } else {
                // Se for string.
                const itemEncontrado = await Item.findOne({
                    item: { $regex: item, $options: 'i' },
                });
                if (itemEncontrado) {
                    this.filtros.item = itemEncontrado._id;
                } else {
                    // Força a busca “vazia”.
                    this.filtros.item = { $in: [] };
                };
            };
        };
        return this;
    };

    async comFornecedor(fornecedor) {
        if (fornecedor) {
            if (Types.ObjectId.isValid(fornecedor)) {
                // Se já for um ObjectId, faz o populate direto.
                this.filtros.fornecedor = fornecedor;
                const fornecedorEncontrado = await Fornecedor.findById(fornecedor);
                if (!fornecedorEncontrado) {
                    // Caso não exista, força a busca “vazia”.
                    this.filtros.fornecedor = { $in: [] };
                };
            } else {
                // Se for string.
                const fornecedorEncontrado = await Fornecedor.findOne({
                    fornecedor: { $regex: fornecedor, $options: 'i' },
                });
                if (fornecedorEncontrado) {
                    this.filtros.fornecedor = fornecedorEncontrado._id;
                } else {
                    // Força a busca “vazia”.
                    this.filtros.fornecedor = { $in: [] };
                };
            };
        };
        return this;
    };

    build() {
        return this.filtros;
    };
};

export default MovimentacaoFilterBuilder;