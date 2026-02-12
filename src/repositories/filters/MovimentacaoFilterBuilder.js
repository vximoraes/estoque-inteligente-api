import MovimentacaoModel from '../../models/Movimentacao.js';
import Componente from '../../models/Componente.js';
import Localizacao from '../../models/Localizacao.js';
import mongoose from 'mongoose';
const { Types } = mongoose;

class MovimentacaoFilterBuilder {
    constructor() {
        this.filtros = {};
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

    async comComponente(componente) {
        if (componente) {
            if (Types.ObjectId.isValid(componente)) {
                // Se já for um ObjectId, faz o populate direto.
                this.filtros.componente = componente;
                const componenteEncontrado = await Componente.findById(componente);
                if (!componenteEncontrado) {
                    // Caso não exista, força a busca "vazia".
                    this.filtros.componente = { $in: [] };
                };
            } else {
                // Se for string.
                const componenteEncontrado = await Componente.findOne({
                    nome: { $regex: componente, $options: 'i' },
                });
                if (componenteEncontrado) {
                    this.filtros.componente = componenteEncontrado._id;
                } else {
                    // Força a busca "vazia".
                    this.filtros.componente = { $in: [] };
                };
            };
        };
        return this;
    };

    async comLocalizacao(localizacao) {
        if (localizacao) {
            if (Types.ObjectId.isValid(localizacao)) {
                // Se já for um ObjectId, faz o populate direto.
                this.filtros.localizacao = localizacao;
                const localizacaoEncontrada = await Localizacao.findById(localizacao);
                if (!localizacaoEncontrada) {
                    // Caso não exista, força a busca "vazia".
                    this.filtros.localizacao = { $in: [] };
                };
            } else {
                // Se for string.
                const localizacaoEncontrada = await Localizacao.findOne({
                    nome: { $regex: localizacao, $options: 'i' },
                });
                if (localizacaoEncontrada) {
                    this.filtros.localizacao = localizacaoEncontrada._id;
                } else {
                    // Força a busca "vazia".
                    this.filtros.localizacao = { $in: [] };
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