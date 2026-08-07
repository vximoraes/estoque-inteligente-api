import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IFornecedor {
  nome: string;
  ativo: boolean;
  usuario: string;
  url?: string;
  contato?: string;
  descricao?: string;
}

export type FornecedorDocument = IFornecedor & Document;

const fornecedorSchema = new mongoose.Schema<FornecedorDocument>({
  nome: { type: String, required: true },
  ativo: { type: Boolean, default: true },
  usuario: { type: String, ref: 'usuarios', required: true },
  url: { type: String, required: false },
  contato: { type: String, required: false },
  descricao: { type: String, required: false },
});

fornecedorSchema.plugin(mongoosePaginate);

export default mongoose.model<FornecedorDocument, mongoose.PaginateModel<FornecedorDocument>>(
  'fornecedores',
  fornecedorSchema,
);
