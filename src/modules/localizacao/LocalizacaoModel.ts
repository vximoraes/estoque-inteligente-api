import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ILocalizacao {
  nome: string;
  ativo: boolean;
  usuario: mongoose.Types.ObjectId;
}

export type LocalizacaoDocument = ILocalizacao & Document;

const localizacaoSchema = new mongoose.Schema<LocalizacaoDocument>(
  {
    nome: { type: String, required: true },
    ativo: { type: Boolean, default: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'usuarios', required: true },
  },
  { timestamps: true },
);

localizacaoSchema.plugin(mongoosePaginate);

export default mongoose.model<LocalizacaoDocument, mongoose.PaginateModel<LocalizacaoDocument>>(
  'localizacoes',
  localizacaoSchema,
);
