import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IRota {
  rota: string;
  dominio: string;
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
    rota: { type: String, index: true, trim: true, lowercase: true },
    dominio: { type: String, required: true },
    ativo: { type: Boolean, default: false },
    buscar: { type: Boolean, default: false },
    enviar: { type: Boolean, default: false },
    substituir: { type: Boolean, default: false },
    modificar: { type: Boolean, default: false },
    excluir: { type: Boolean, default: false },
  },
  { timestamps: true },
);

rotaSchema.index({ rota: 1, dominio: 1 }, { unique: true });
rotaSchema.plugin(mongoosePaginate);

rotaSchema.pre('save', function (this: RotaDocument, next) {
  if (this.rota) {
    this.rota = this.rota.toLowerCase();
  }
  next();
});

export default mongoose.model<RotaDocument, mongoose.PaginateModel<RotaDocument>>('rotas', rotaSchema);
