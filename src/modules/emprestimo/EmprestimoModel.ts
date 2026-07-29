import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IEmprestimo {
  item: mongoose.Types.ObjectId;
  localizacao: mongoose.Types.ObjectId;
  quantidade_emprestada: number;
  quantidade_devolvida: number;
  quantidade_aberta: number;
  solicitante_nome: string;
  solicitante_email?: string;
  data_saida?: Date;
  data_prevista_devolucao?: Date | null;
  data_devolucao_total?: Date | null;
  observacoes_emprestimo?: string;
  observacoes_devolucao?: string;
  usuario_responsavel: string;
  ativo: boolean;
  email_atraso_enviado: boolean;
}

export type EmprestimoDocument = IEmprestimo & Document;

const emprestimoSchema = new mongoose.Schema<EmprestimoDocument>(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'itens', required: true, index: true },
    localizacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'localizacoes',
      required: true,
      index: true,
    },
    quantidade_emprestada: { type: Number, required: true, min: 1, max: 999999999 },
    quantidade_devolvida: { type: Number, default: 0, min: 0, max: 999999999 },
    quantidade_aberta: { type: Number, required: true, min: 0, max: 999999999 },
    solicitante_nome: { type: String, required: true, trim: true, index: true },
    solicitante_email: { type: String, default: '', trim: true },
    data_saida: { type: Date, default: Date.now, index: true },
    data_prevista_devolucao: { type: Date, default: null, index: true },
    data_devolucao_total: { type: Date, default: null },
    observacoes_emprestimo: { type: String, default: '', trim: true },
    observacoes_devolucao: { type: String, default: '', trim: true },
    usuario_responsavel: {
      type: String,
      ref: 'usuarios',
      required: true,
    },
    ativo: { type: Boolean, default: true, index: true },
    email_atraso_enviado: { type: Boolean, default: false },
  },
  { timestamps: true },
);

emprestimoSchema.index({ item: 1, localizacao: 1, data_saida: -1 });

emprestimoSchema.pre('validate', function (this: EmprestimoDocument) {
  if (this.quantidade_aberta === undefined || this.quantidade_aberta === null) {
    this.quantidade_aberta = this.quantidade_emprestada - (this.quantidade_devolvida || 0);
  }
  if (this.quantidade_aberta < 0) {
    this.quantidade_aberta = 0;
  }
});

emprestimoSchema.plugin(mongoosePaginate);

export default mongoose.model<EmprestimoDocument, mongoose.PaginateModel<EmprestimoDocument>>(
  'emprestimos',
  emprestimoSchema,
);
