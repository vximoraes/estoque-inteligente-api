import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IItem {
  nome: string;
  tipo: 'consumo' | 'permanente';
  quantidade: number;
  quantidade_disponivel: number;
  estoque_minimo: number;
  descricao?: string;
  imagem?: string;
  categoria: mongoose.Types.ObjectId;
  ativo: boolean;
  usuario: string;
  status: 'Indisponível' | 'Baixo Estoque' | 'Em Estoque';
}

export type ItemDocument = IItem & Document;

const itemSchema = new mongoose.Schema<ItemDocument>(
  {
    nome: { type: String, required: true },
    tipo: {
      type: String,
      enum: ['consumo', 'permanente'],
      default: 'consumo',
      required: true,
      immutable: true,
    },
    quantidade: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
      max: 999999999,
    },
    quantidade_disponivel: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
      max: 999999999,
    },
    estoque_minimo: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
      max: 999999999,
    },
    descricao: { type: String, required: false },
    imagem: { type: String, required: false },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categorias',
      required: true,
    },
    ativo: { type: Boolean, default: true },
    usuario: { type: String, ref: 'usuarios', required: true },
    status: {
      type: String,
      enum: ['Indisponível', 'Baixo Estoque', 'Em Estoque'],
      default: 'Indisponível',
      required: true,
    },
  },
  { timestamps: true },
);

itemSchema.index(
  { nome: 1 },
  { unique: true, partialFilterExpression: { ativo: true } },
);

// Item permanente não tem "estoque mínimo" (a quantidade total inclui
// unidades em Manutenção, que não emprestam) — o status precisa refletir
// `quantidade_disponivel`, não `quantidade`, senão um item com todas as
// unidades em manutenção/baixadas aparece como "Em Estoque" mesmo sem
// nenhuma unidade emprestável.
function statusDePermanente(
  quantidadeDisponivel: number,
): ItemDocument['status'] {
  return quantidadeDisponivel === 0 ? 'Indisponível' : 'Em Estoque';
}

function statusDeConsumo(
  quantidade: number,
  estoqueMinimo: number,
): ItemDocument['status'] {
  if (quantidade === 0) return 'Indisponível';
  if (quantidade < estoqueMinimo) return 'Baixo Estoque';
  return 'Em Estoque';
}

itemSchema.pre('save', function (this: ItemDocument) {
  this.status =
    this.tipo === 'permanente'
      ? statusDePermanente(this.quantidade_disponivel)
      : statusDeConsumo(this.quantidade, this.estoque_minimo);
});

itemSchema.pre(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, ItemDocument>) {
    const update = this.getUpdate() as Record<string, unknown> | null;
    if (
      update &&
      (update['quantidade'] !== undefined ||
        update['quantidade_disponivel'] !== undefined ||
        update['estoque_minimo'] !== undefined)
    ) {
      const docAtual = await (
        this.model as mongoose.Model<ItemDocument>
      ).findOne(this.getQuery() as mongoose.FilterQuery<ItemDocument>);

      if (docAtual) {
        if (docAtual.tipo === 'permanente') {
          const quantidadeDisponivel =
            update['quantidade_disponivel'] !== undefined
              ? (update['quantidade_disponivel'] as number)
              : docAtual.quantidade_disponivel;
          this.set({ status: statusDePermanente(quantidadeDisponivel) });
          return;
        }

        const quantidade =
          update['quantidade'] !== undefined
            ? (update['quantidade'] as number)
            : docAtual.quantidade;
        const estoque_minimo =
          update['estoque_minimo'] !== undefined
            ? (update['estoque_minimo'] as number)
            : docAtual.estoque_minimo;

        this.set({ status: statusDeConsumo(quantidade, estoque_minimo) });
      }
    }
  },
);

itemSchema.plugin(mongoosePaginate);

export default mongoose.model<
  ItemDocument,
  mongoose.PaginateModel<ItemDocument>
>('itens', itemSchema);
