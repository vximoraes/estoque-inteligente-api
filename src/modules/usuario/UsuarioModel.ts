import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import type { IGrupoPermissao } from '../grupo/GrupoModel.js';

export interface IUsuario {
  nome: string;
  email: string;
  senha?: string;
  ativo: boolean;
  tokenUnico?: string;
  tokenConvite?: string;
  convidadoEm?: Date;
  ativadoEm?: Date;
  refreshtoken?: string | null;
  accesstoken?: string | null;
  grupos: mongoose.Types.ObjectId[];
  permissoes: IGrupoPermissao[];
  fotoPerfil?: string;
}

export type UsuarioDocument = IUsuario & Document;

const usuarioSchema = new mongoose.Schema<UsuarioDocument>({
  nome: { type: String, index: true, required: true },
  email: { type: String, unique: true, required: true },
  senha: { type: String, select: false, required: false },
  ativo: { type: Boolean, default: false },
  tokenUnico: { type: String, select: false },
  tokenConvite: { type: String, select: false },
  convidadoEm: { type: Date, select: false },
  ativadoEm: { type: Date, select: false },
  refreshtoken: { type: String, select: false },
  accesstoken: { type: String, select: false },
  grupos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'grupos' }],
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
  fotoPerfil: { type: String, required: false },
});

usuarioSchema.plugin(mongoosePaginate);

export default mongoose.model<UsuarioDocument, mongoose.PaginateModel<UsuarioDocument>>(
  'usuarios',
  usuarioSchema,
);
