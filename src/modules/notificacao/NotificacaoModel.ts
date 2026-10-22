import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface INotificacao {
  mensagem: string;
  data_hora: Date;
  visualizada: boolean;
  dataLeitura?: Date;
  ativo: boolean;
  usuario: mongoose.Types.ObjectId;
}

export type NotificacaoDocument = INotificacao & Document;

const notificacaoSchema = new mongoose.Schema<NotificacaoDocument>({
  mensagem: { type: String, required: true },
  data_hora: { type: Date, required: true, default: Date.now },
  visualizada: { type: Boolean, required: false, default: false },
  dataLeitura: { type: Date, required: false },
  ativo: { type: Boolean, required: false, default: true },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'usuarios',
    required: true,
  },
});

export const DIAS_PARA_APAGAR_LIDA = 30;

notificacaoSchema.index({ usuario: 1, ativo: 1, data_hora: -1 });
notificacaoSchema.index(
  { dataLeitura: 1 },
  { expireAfterSeconds: DIAS_PARA_APAGAR_LIDA * 24 * 60 * 60 },
);

notificacaoSchema.plugin(mongoosePaginate);

export default mongoose.model<
  NotificacaoDocument,
  mongoose.PaginateModel<NotificacaoDocument>
>('notificacoes', notificacaoSchema);
