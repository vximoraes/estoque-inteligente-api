import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import SSEService from '../services/SSEService.js';

class Estoque {
  constructor() {
    const estoqueSchema = new mongoose.Schema(
      {
        quantidade: {
          type: Number,
          required: true,
          default: 0,
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
      },
      {
        timestamps: true,
      },
    );

    estoqueSchema.index({ item: 1, localizacao: 1 }, { unique: true });

    estoqueSchema.post('save', async function () {
      await this.constructor.atualizarQuantidadeItem(this.item);
    });

    estoqueSchema.post('deleteOne', async function () {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await this.model.atualizarQuantidadeItem(doc.item);
      }
    });

    estoqueSchema.post(['updateOne', 'findOneAndUpdate'], async function () {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await this.model.atualizarQuantidadeItem(doc.item);
      }
    });

    estoqueSchema.statics.atualizarQuantidadeItem = async function (itemId) {
      const Item = mongoose.model('itens');
      const Notificacao = mongoose.model('notificacoes');

      const resultado = await this.aggregate([
        { $match: { item: itemId } },
        { $group: { _id: null, quantidadeTotal: { $sum: '$quantidade' } } },
      ]);

      const quantidadeTotal =
        resultado.length > 0 ? resultado[0].quantidadeTotal : 0;

      const item = await Item.findById(itemId);

      if (item) {
        const quantidadeAnterior = item.quantidade || 0;
        const estoqueMinimo = item.estoque_minimo || 0;

        await Item.findByIdAndUpdate(itemId, { quantidade: quantidadeTotal });

        let mensagem = null;

        if (quantidadeTotal === 0 && quantidadeAnterior > 0) {
          mensagem = `${item.nome} está indisponível (0 unidades)`;
        } else if (
          quantidadeTotal >= estoqueMinimo &&
          quantidadeAnterior < estoqueMinimo
        ) {
          mensagem = `${item.nome} está em estoque (${quantidadeTotal} unidades)`;
        } else if (
          quantidadeTotal > 0 &&
          quantidadeTotal < estoqueMinimo &&
          quantidadeAnterior === 0
        ) {
          mensagem = `${item.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
        } else if (
          quantidadeTotal > 0 &&
          quantidadeTotal < estoqueMinimo &&
          quantidadeAnterior >= estoqueMinimo
        ) {
          mensagem = `${item.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
        }

        if (mensagem && item.usuario) {
          const novaNotificacao = await Notificacao.create({
            mensagem,
            data_hora: new Date(),
            visualizada: false,
            ativo: true,
            usuario: item.usuario,
          });

          SSEService.sendNotification(item.usuario, {
            _id: novaNotificacao._id,
            mensagem: novaNotificacao.mensagem,
            data_hora: novaNotificacao.data_hora,
            visualizada: novaNotificacao.visualizada,
          });
        }
      }
    };

    estoqueSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('estoques', estoqueSchema);
  }
}

export default new Estoque().model;
