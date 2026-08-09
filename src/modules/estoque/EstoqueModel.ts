import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import SSEService from '../../utils/services/SSEService.js';

export interface IEstoque {
  quantidade: number;
  item: mongoose.Types.ObjectId;
  localizacao: mongoose.Types.ObjectId;
  usuario: string;
}

export type EstoqueDocument = IEstoque & Document;

export interface IEstoqueModel extends mongoose.PaginateModel<EstoqueDocument> {
  atualizarQuantidadeItem(itemId: mongoose.Types.ObjectId): Promise<void>;
}

const estoqueSchema = new mongoose.Schema<EstoqueDocument>(
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
    usuario: { type: String, ref: 'usuarios', required: true },
  },
  { timestamps: true },
);

estoqueSchema.index({ item: 1, localizacao: 1 }, { unique: true });

estoqueSchema.post('save', async function (this: EstoqueDocument) {
  const Model = this.constructor as unknown as IEstoqueModel;
  await Model.atualizarQuantidadeItem(this.item);
});

estoqueSchema.post(
  'deleteOne',
  async function (this: mongoose.Query<unknown, EstoqueDocument>) {
    const model = this.model as unknown as IEstoqueModel;
    const doc = await model.findOne(
      this.getQuery() as mongoose.FilterQuery<EstoqueDocument>,
    );
    if (doc) {
      await model.atualizarQuantidadeItem(doc.item);
    }
  },
);

estoqueSchema.post(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, EstoqueDocument>) {
    const model = this.model as unknown as IEstoqueModel;
    const doc = await model.findOne(
      this.getQuery() as mongoose.FilterQuery<EstoqueDocument>,
    );
    if (doc) {
      await model.atualizarQuantidadeItem(doc.item);
    }
  },
);

estoqueSchema.statics['atualizarQuantidadeItem'] = async function (
  this: unknown,
  itemId: mongoose.Types.ObjectId,
) {
  const self = this as IEstoqueModel;
  const Item = mongoose.model('itens');
  const Notificacao = mongoose.model('notificacoes');

  const resultado = (await self.aggregate([
    { $match: { item: itemId } },
    { $group: { _id: null, quantidadeTotal: { $sum: '$quantidade' } } },
  ])) as Array<{ quantidadeTotal: number }>;

  const quantidadeTotal =
    resultado.length > 0 ? (resultado[0]?.quantidadeTotal ?? 0) : 0;

  const item = (await Item.findById(itemId)) as Record<string, unknown> | null;

  if (item) {
    const quantidadeAnterior = (item['quantidade'] as number) || 0;
    const estoqueMinimo = (item['estoque_minimo'] as number) || 0;
    const nomeItem = item['nome'] as string;

    await Item.findByIdAndUpdate(itemId, { quantidade: quantidadeTotal });

    let mensagem: string | null = null;

    if (quantidadeTotal === 0 && quantidadeAnterior > 0) {
      mensagem = `${nomeItem} está indisponível (0 unidades)`;
    } else if (
      quantidadeTotal >= estoqueMinimo &&
      quantidadeAnterior < estoqueMinimo
    ) {
      mensagem = `${nomeItem} está em estoque (${quantidadeTotal} unidades)`;
    } else if (
      quantidadeTotal > 0 &&
      quantidadeTotal < estoqueMinimo &&
      quantidadeAnterior === 0
    ) {
      mensagem = `${nomeItem} está com estoque baixo (${quantidadeTotal} unidades)`;
    } else if (
      quantidadeTotal > 0 &&
      quantidadeTotal < estoqueMinimo &&
      quantidadeAnterior >= estoqueMinimo
    ) {
      mensagem = `${nomeItem} está com estoque baixo (${quantidadeTotal} unidades)`;
    }

    if (mensagem && item['usuario']) {
      const novaNotificacao = (await Notificacao.create({
        mensagem,
        data_hora: new Date(),
        visualizada: false,
        ativo: true,
        usuario: item['usuario'],
      })) as Record<string, unknown>;

      SSEService.sendNotification(item['usuario'], {
        _id: novaNotificacao['_id'],
        mensagem: novaNotificacao['mensagem'],
        data_hora: novaNotificacao['data_hora'],
        visualizada: novaNotificacao['visualizada'],
      });
    }
  }
};

estoqueSchema.plugin(mongoosePaginate);

export default mongoose.model<EstoqueDocument, IEstoqueModel>(
  'estoques',
  estoqueSchema,
);
