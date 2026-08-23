import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IRota {
  rota: string;
  ativo: boolean;
  buscar: boolean;
  enviar: boolean;
  substituir: boolean;
  modificar: boolean;
  excluir: boolean;
}

export type RotaDocument = IRota & Document;

const rotaSchema = new mongoose.Schema<RotaDocument>(
  {
    rota: { type: String, trim: true, lowercase: true, unique: true },
    ativo: { type: Boolean, default: false },
    buscar: { type: Boolean, default: false },
    enviar: { type: Boolean, default: false },
    substituir: { type: Boolean, default: false },
    modificar: { type: Boolean, default: false },
    excluir: { type: Boolean, default: false },
  },
  { timestamps: true },
);

rotaSchema.plugin(mongoosePaginate);

rotaSchema.pre('save', function (this: RotaDocument, next) {
  if (this.rota) {
    this.rota = this.rota.toLowerCase();
  }
  next();
});

export default mongoose.model<
  RotaDocument,
  mongoose.PaginateModel<RotaDocument>
>('rotas', rotaSchema);
