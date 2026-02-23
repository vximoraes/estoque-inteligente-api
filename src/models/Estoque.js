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

    // Index composto para garantir unicidade de item por localização
    estoqueSchema.index({ item: 1, localizacao: 1 }, { unique: true });

    // Middleware para atualizar quantidade total do item após salvar
    estoqueSchema.post('save', async function () {
      await this.constructor.atualizarQuantidadeItem(this.item);
    });

    // Middleware para atualizar quantidade total do item após remoção
    estoqueSchema.post('deleteOne', async function () {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await this.model.atualizarQuantidadeItem(doc.item);
      }
    });

    // Middleware para atualizar quantidade total do item após update
    estoqueSchema.post(['updateOne', 'findOneAndUpdate'], async function () {
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await this.model.atualizarQuantidadeItem(doc.item);
      }
    });

    // Método estático para atualizar quantidade total do item
    estoqueSchema.statics.atualizarQuantidadeItem = async function (itemId) {
      const Item = mongoose.model('itens');
      const Notificacao = mongoose.model('notificacoes');

      // Soma todas as quantidades do item em todas as localizações
      const resultado = await this.aggregate([
        { $match: { item: itemId } },
        { $group: { _id: null, quantidadeTotal: { $sum: '$quantidade' } } },
      ]);

      const quantidadeTotal =
        resultado.length > 0 ? resultado[0].quantidadeTotal : 0;

      // Buscar item para verificar estoque mínimo e criar notificação
      const item = await Item.findById(itemId);

      if (item) {
        const quantidadeAnterior = item.quantidade || 0;
        const estoqueMinimo = item.estoque_minimo || 0;

        console.log(
          '[DEBUG Notificação] quantidadeAnterior:',
          quantidadeAnterior,
          'quantidadeTotal:',
          quantidadeTotal,
          'estoqueMinimo:',
          estoqueMinimo,
        );

        // Atualiza a quantidade total no item
        await Item.findByIdAndUpdate(itemId, { quantidade: quantidadeTotal });

        // Criar notificações baseadas no status do estoque
        let mensagem = null;

        if (quantidadeTotal === 0 && quantidadeAnterior > 0) {
          // Item ficou indisponível
          mensagem = `${item.nome} está indisponível (0 unidades)`;
        } else if (
          quantidadeTotal >= estoqueMinimo &&
          quantidadeAnterior < estoqueMinimo
        ) {
          // Item voltou ao estoque normal (estava indisponível ou baixo estoque)
          mensagem = `${item.nome} está em estoque (${quantidadeTotal} unidades)`;
        } else if (
          quantidadeTotal > 0 &&
          quantidadeTotal < estoqueMinimo &&
          quantidadeAnterior === 0
        ) {
          // Item saiu de indisponível para baixo estoque
          mensagem = `${item.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
        } else if (
          quantidadeTotal > 0 &&
          quantidadeTotal < estoqueMinimo &&
          quantidadeAnterior >= estoqueMinimo
        ) {
          // Item ficou com estoque baixo (estava em estoque normal)
          mensagem = `${item.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
        }

        console.log('[DEBUG Notificação] mensagem a criar:', mensagem);

        // Criar notificação se houver mensagem
        if (mensagem && item.usuario) {
          const novaNotificacao = await Notificacao.create({
            mensagem,
            data_hora: new Date(),
            visualizada: false,
            ativo: true,
            usuario: item.usuario,
          });

          console.log(
            '[DEBUG SSE] Enviando notificação para usuário:',
            item.usuario.toString(),
          );

          // Envia notificação via SSE para o usuário
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
