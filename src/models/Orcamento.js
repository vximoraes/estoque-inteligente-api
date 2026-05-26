import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Orcamento {
  constructor() {
    const orcamentoSchema = new mongoose.Schema(
      {
        nome: {
          type: String,
          index: true,
          required: true,
        },
        descricao: {
          type: String,
          required: false,
        },
        total: {
          type: Number,
          default: 0,
        },
        itens: [
          {
            item: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'itens',
              required: true,
            },
            nome: {
              type: String,
              required: true,
            },
            fornecedor: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'fornecedores',
              required: true,
            },
            quantidade: {
              type: Number,
              required: true,
              min: 1,
              max: 999999999,
            },
            valor_unitario: {
              type: Number,
              required: true,
              min: 0,
            },
            subtotal: {
              type: Number,
              default: 0,
              min: 0,
            },
          },
        ],
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'usuarios',
          required: true,
        },
        ativo: {
          type: Boolean,
          default: true,
        },
      },
      {
        timestamps: true,
      },
    );

    orcamentoSchema.pre('save', function () {
      this.itens.forEach((comp) => {
        comp.subtotal = parseFloat(
          (comp.quantidade * comp.valor_unitario).toFixed(2),
        );
      });

      this.total = parseFloat(
        this.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
      );
    });

    orcamentoSchema.pre(['updateOne', 'findOneAndUpdate'], function () {
      const update = this.getUpdate();
      if (update.itens) {
        update.itens.forEach((comp) => {
          comp.subtotal = parseFloat(
            (comp.quantidade * comp.valor_unitario).toFixed(2),
          );
        });

        update.total = parseFloat(
          update.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
        );
      }
    });

    orcamentoSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('orcamentos', orcamentoSchema);
  }
}

export default new Orcamento().model;
