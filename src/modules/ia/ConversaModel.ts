import mongoose, { Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export const MAX_MENSAGENS = 100;

export interface IMensagem {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface IConversa {
  usuario: string;
  titulo: string;
  mensagens: IMensagem[];
  resumo?: string;
  resumoAteIndice?: number;
  criada_em?: Date;
  atualizada_em?: Date;
}

export type ConversaDocument = IConversa & Document;

const mensagemSchema = new mongoose.Schema<IMensagem>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const conversaSchema = new mongoose.Schema<ConversaDocument>(
  {
    usuario: {
      type: String,
      ref: 'usuarios',
      required: true,
      index: true,
    },
    titulo: {
      type: String,
      required: true,
      maxlength: 60,
      default: 'Nova conversa',
    },
    mensagens: {
      type: [mensagemSchema],
      default: [],
      validate: {
        validator(v: IMensagem[]) {
          return v.length <= MAX_MENSAGENS;
        },
        message: `Uma conversa não pode ter mais de ${MAX_MENSAGENS} mensagens.`,
      },
    },
    resumo: {
      type: String,
      default: '',
    },
    resumoAteIndice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'criada_em', updatedAt: 'atualizada_em' },
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ocultarCamposInternos(_doc: unknown, ret: any) {
  delete ret['resumo'];
  delete ret['resumoAteIndice'];
  return ret;
}

conversaSchema.set('toObject', { transform: ocultarCamposInternos });
conversaSchema.set('toJSON', { transform: ocultarCamposInternos });

conversaSchema.plugin(mongoosePaginate);

export default mongoose.model<
  ConversaDocument,
  mongoose.PaginateModel<ConversaDocument>
>('conversas', conversaSchema);
