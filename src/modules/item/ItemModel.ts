import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IItem {
  nome: string;
  quantidade: number;
  estoque_minimo: number;
  descricao?: string;
  imagem?: string;
  categoria: mongoose.Types.ObjectId;
  ativo: boolean;
  usuario: mongoose.Types.ObjectId;
  status: 'Indisponível' | 'Baixo Estoque' | 'Em Estoque';
}

export type ItemDocument = IItem & Document;

const itemSchema = new mongoose.Schema<ItemDocument>(
  {
    nome: { type: String, required: true },
    quantidade: { type: Number, required: false, default: 0, min: 0, max: 999999999 },
    estoque_minimo: { type: Number, required: true, min: 0, max: 999999999 },
    descricao: { type: String, required: false },
    imagem: { type: String, required: false },
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'categorias', required: true },
    ativo: { type: Boolean, default: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'usuarios', required: true },
    status: {
      type: String,
      enum: ['Indisponível', 'Baixo Estoque', 'Em Estoque'],
      default: 'Indisponível',
      required: true,
    },
  },
  { timestamps: true },
);

itemSchema.pre('save', function (this: ItemDocument) {
  if (this.quantidade === 0) {
    this.status = 'Indisponível';
  } else if (this.quantidade < this.estoque_minimo) {
    this.status = 'Baixo Estoque';
  } else {
    this.status = 'Em Estoque';
  }
});

itemSchema.pre(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, ItemDocument>) {
    const update = this.getUpdate() as Record<string, unknown> | null;
    if (
      update &&
      (update['quantidade'] !== undefined || update['estoque_minimo'] !== undefined)
    ) {
      const docAtual = await (this.model as mongoose.Model<ItemDocument>).findOne(
        this.getQuery() as mongoose.FilterQuery<ItemDocument>,
      );

      if (docAtual) {
        const quantidade =
          update['quantidade'] !== undefined
            ? (update['quantidade'] as number)
            : docAtual.quantidade;
        const estoque_minimo =
          update['estoque_minimo'] !== undefined
            ? (update['estoque_minimo'] as number)
            : docAtual.estoque_minimo;

        if (quantidade === 0) {
          this.set({ status: 'Indisponível' });
        } else if (quantidade < estoque_minimo) {
          this.set({ status: 'Baixo Estoque' });
        } else {
          this.set({ status: 'Em Estoque' });
        }
      }
    }
  },
);

itemSchema.plugin(mongoosePaginate);

export default mongoose.model<ItemDocument, mongoose.PaginateModel<ItemDocument>>(
  'itens',
  itemSchema,
);
