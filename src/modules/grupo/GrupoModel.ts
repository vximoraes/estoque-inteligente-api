import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IGrupoPermissao {
  rota: string;
  dominio?: string;
  ativo: boolean;
  buscar: boolean;
  enviar: boolean;
  substituir: boolean;
  modificar: boolean;
  excluir: boolean;
}

export interface IGrupo {
  nome: string;
  descricao: string;
  ativo: boolean;
  permissoes: IGrupoPermissao[];
}

export type GrupoDocument = IGrupo & Document;

const grupoSchema = new mongoose.Schema<GrupoDocument>(
  {
    nome: { type: String, index: true, unique: true },
    descricao: { type: String, required: true },
    ativo: { type: Boolean, default: true },
    permissoes: [
      {
        rota: { type: String, index: true, required: true },
        dominio: { type: String },
        ativo: { type: Boolean, default: false },
        buscar: { type: Boolean, default: false },
        enviar: { type: Boolean, default: false },
        substituir: { type: Boolean, default: false },
        modificar: { type: Boolean, default: false },
        excluir: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

grupoSchema.pre('save', function (this: GrupoDocument, next) {
  const permissoes = this.permissoes;
  const combinacoes = permissoes.map((p) => `${p.rota}_${p.dominio}`);
  const setCombinacoes = new Set(combinacoes);

  if (combinacoes.length !== setCombinacoes.size) {
    return next(
      new Error(
        'Permissoes duplicadas encontradas: rota + dominio devem ser unicos dentro de cada grupo.',
      ),
    );
  }

  next();
});

grupoSchema.plugin(mongoosePaginate);

export default mongoose.model<
  GrupoDocument,
  mongoose.PaginateModel<GrupoDocument>
>('grupos', grupoSchema);
