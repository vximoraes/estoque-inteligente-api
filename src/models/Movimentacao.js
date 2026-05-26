import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Movimentacao {
  constructor() {
    const movimentacaoSchema = new mongoose.Schema({
      tipo: {
        type: String,
        index: true,
        required: true,
        enum: { values: ['entrada', 'saida'] },
      },
      data_hora: {
        type: Date,
        required: true,
        default: Date.now,
      },
      quantidade: {
        type: Number,
        required: true,
        min: 0,
        max: 999999999,
      },
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'itens',
        required: true,
      },
      localizacao: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'localizacoes',
        required: true,
      },
      usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'usuarios',
        required: true,
      },
    });

    movimentacaoSchema.post('save', async function () {
      await this.constructor.atualizarEstoque(
        this.item,
        this.localizacao,
        this.usuario,
      );
    });

    movimentacaoSchema.post('deleteOne', async function () {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await this.model.atualizarEstoque(
          doc.item,
          doc.localizacao,
          doc.usuario,
        );
      }
    });

    movimentacaoSchema.post(
      ['updateOne', 'findOneAndUpdate'],
      async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (doc) {
          await this.model.atualizarEstoque(
            doc.item,
            doc.localizacao,
            doc.usuario,
          );
        }
      },
    );

    movimentacaoSchema.statics.atualizarEstoque = async function (
      itemId,
      localizacaoId,
      usuarioId,
    ) {
      const EstoqueModel = mongoose.model('estoques');

      const resultado = await this.aggregate([
        {
          $match: {
            item: itemId,
            localizacao: localizacaoId,
          },
        },
        {
          $group: {
            _id: null,
            quantidadeTotal: {
              $sum: {
                $cond: [
                  { $eq: ['$tipo', 'entrada'] },
                  '$quantidade',
                  { $multiply: ['$quantidade', -1] },
                ],
              },
            },
          },
        },
      ]);

      const quantidadeTotal =
        resultado.length > 0 ? Math.max(0, resultado[0].quantidadeTotal) : 0;

      await EstoqueModel.findOneAndUpdate(
        {
          item: itemId,
          localizacao: localizacaoId,
        },
        {
          quantidade: quantidadeTotal,
          usuario: usuarioId,
        },
        {
          upsert: true,
          new: true,
        },
      );

      await EstoqueModel.atualizarQuantidadeItem(itemId);
    };

    movimentacaoSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('movimentacoes', movimentacaoSchema);
  }
}

export default new Movimentacao().model;
