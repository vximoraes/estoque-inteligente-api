import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import type { IEstoqueModel } from '../estoque/EstoqueModel.js';

export interface IMovimentacao {
  tipo: 'entrada' | 'saida';
  data_hora: Date;
  quantidade: number;
  item: mongoose.Types.ObjectId;
  localizacao: mongoose.Types.ObjectId;
  usuario: string;
}

export type MovimentacaoDocument = IMovimentacao & Document;

export interface IMovimentacaoModel extends mongoose.PaginateModel<MovimentacaoDocument> {
  atualizarEstoque(
    itemId: mongoose.Types.ObjectId,
    localizacaoId: mongoose.Types.ObjectId,
    usuarioId: string,
  ): Promise<void>;
}

const movimentacaoSchema = new mongoose.Schema<MovimentacaoDocument>(
  {
    tipo: { type: String, index: true, required: true, enum: ['entrada', 'saida'] },
    data_hora: { type: Date, required: true, default: Date.now },
    quantidade: { type: Number, required: true, min: 0, max: 999999999 },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'itens', required: true },
    localizacao: { type: mongoose.Schema.Types.ObjectId, ref: 'localizacoes', required: true },
    usuario: { type: String, ref: 'usuarios', required: true },
  },
  { timestamps: true },
);

movimentacaoSchema.post('save', async function (this: MovimentacaoDocument) {
  const Model = this.constructor as unknown as IMovimentacaoModel;
  await Model.atualizarEstoque(this.item, this.localizacao, this.usuario);
});

movimentacaoSchema.post(
  'deleteOne',
  async function (this: mongoose.Query<unknown, MovimentacaoDocument>) {
    const model = this.model as unknown as IMovimentacaoModel;
    const doc = await model.findOne(this.getQuery() as mongoose.FilterQuery<MovimentacaoDocument>);
    if (doc) {
      await model.atualizarEstoque(doc.item, doc.localizacao, doc.usuario);
    }
  },
);

movimentacaoSchema.post(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, MovimentacaoDocument>) {
    const model = this.model as unknown as IMovimentacaoModel;
    const doc = await model.findOne(this.getQuery() as mongoose.FilterQuery<MovimentacaoDocument>);
    if (doc) {
      await model.atualizarEstoque(doc.item, doc.localizacao, doc.usuario);
    }
  },
);

movimentacaoSchema.statics['atualizarEstoque'] = async function (
  this: unknown,
  itemId: mongoose.Types.ObjectId,
  localizacaoId: mongoose.Types.ObjectId,
  usuarioId: string,
) {
  const self = this as IMovimentacaoModel;
  const EstoqueModel = mongoose.model('estoques') as unknown as IEstoqueModel;

  const resultado = (await self.aggregate([
    { $match: { item: itemId, localizacao: localizacaoId } },
    {
      $group: {
        _id: null,
        quantidadeTotal: {
          $sum: {
            $cond: [{ $eq: ['$tipo', 'entrada'] }, '$quantidade', { $multiply: ['$quantidade', -1] }],
          },
        },
      },
    },
  ])) as Array<{ quantidadeTotal: number }>;

  const quantidadeTotal = resultado.length > 0 ? Math.max(0, resultado[0]?.quantidadeTotal ?? 0) : 0;

  await EstoqueModel.findOneAndUpdate(
    { item: itemId, localizacao: localizacaoId },
    { quantidade: quantidadeTotal, usuario: usuarioId },
    { upsert: true, new: true },
  );

  await EstoqueModel.atualizarQuantidadeItem(itemId);
};

movimentacaoSchema.plugin(mongoosePaginate);

export default mongoose.model<MovimentacaoDocument, IMovimentacaoModel>(
  'movimentacoes',
  movimentacaoSchema,
);
