import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IItemOrcamento {
  _id?: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  nome: string;
  fornecedor: mongoose.Types.ObjectId;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
}

export interface IOrcamento {
  nome: string;
  descricao?: string;
  total: number;
  itens: IItemOrcamento[];
  usuario: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrcamentoDocument = IOrcamento & Document;

const orcamentoSchema = new mongoose.Schema<OrcamentoDocument>(
  {
    nome: { type: String, index: true, required: true },
    descricao: { type: String, required: false },
    total: { type: Number, default: 0 },
    itens: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'itens', required: true },
        nome: { type: String, required: true },
        fornecedor: { type: mongoose.Schema.Types.ObjectId, ref: 'fornecedores', required: true },
        quantidade: { type: Number, required: true, min: 1, max: 999999999 },
        valor_unitario: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, default: 0, min: 0 },
      },
    ],
    usuario: { type: String, ref: 'usuarios', required: true },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

orcamentoSchema.pre('save', function (this: OrcamentoDocument) {
  this.itens.forEach((comp) => {
    comp.subtotal = parseFloat((comp.quantidade * comp.valor_unitario).toFixed(2));
  });
  this.total = parseFloat(
    this.itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
  );
});

orcamentoSchema.pre(['updateOne', 'findOneAndUpdate'], function () {
  const update = this.getUpdate() as Record<string, unknown>;
  if (update && 'itens' in update) {
    const itens = update['itens'] as IItemOrcamento[];
    itens.forEach((comp) => {
      comp.subtotal = parseFloat((comp.quantidade * comp.valor_unitario).toFixed(2));
    });
    update['total'] = parseFloat(
      itens.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2),
    );
  }
});

orcamentoSchema.plugin(mongoosePaginate);

export default mongoose.model<OrcamentoDocument, mongoose.PaginateModel<OrcamentoDocument>>(
  'orcamentos',
  orcamentoSchema,
);
