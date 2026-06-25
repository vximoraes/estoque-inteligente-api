import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ICategoria {
  nome: string;
  ativo: boolean;
  usuario: mongoose.Types.ObjectId;
}

export type CategoriaDocument = ICategoria & Document;

const categoriaSchema = new mongoose.Schema<CategoriaDocument>(
  {
    nome: { type: String, required: true },
    ativo: { type: Boolean, default: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'usuarios', required: true },
  },
  { timestamps: true },
);

categoriaSchema.plugin(mongoosePaginate);

export default mongoose.model<CategoriaDocument, mongoose.PaginateModel<CategoriaDocument>>(
  'categorias',
  categoriaSchema,
);
