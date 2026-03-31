import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Emprestimo {
  constructor() {
    const emprestimoSchema = new mongoose.Schema(
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'itens',
          required: true,
          index: true,
        },
        localizacao: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'localizacoes',
          required: true,
          index: true,
        },
        quantidade_emprestada: {
          type: Number,
          required: true,
          min: 1,
          max: 999999999,
        },
        quantidade_devolvida: {
          type: Number,
          default: 0,
          min: 0,
          max: 999999999,
        },
        quantidade_aberta: {
          type: Number,
          required: true,
          min: 0,
          max: 999999999,
        },
        solicitante_nome: {
          type: String,
          required: true,
          trim: true,
          index: true,
        },
        data_saida: {
          type: Date,
          default: Date.now,
          index: true,
        },
        data_prevista_devolucao: {
          type: Date,
          default: null,
          index: true,
        },
        data_devolucao_total: {
          type: Date,
          default: null,
        },
        observacoes_emprestimo: {
          type: String,
          default: '',
          trim: true,
        },
        observacoes_devolucao: {
          type: String,
          default: '',
          trim: true,
        },
        usuario_responsavel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'usuarios',
          required: true,
        },
        ativo: {
          type: Boolean,
          default: true,
          index: true,
        },
      },
      {
        timestamps: true,
      },
    );

    emprestimoSchema.index({ item: 1, localizacao: 1, data_saida: -1 });

    emprestimoSchema.pre('validate', function () {
      if (this.quantidade_aberta === undefined || this.quantidade_aberta === null) {
        this.quantidade_aberta =
          this.quantidade_emprestada - (this.quantidade_devolvida || 0);
      }

      if (this.quantidade_aberta < 0) {
        this.quantidade_aberta = 0;
      }
    });

    emprestimoSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('emprestimos', emprestimoSchema);
  }
}

export default new Emprestimo().model;
