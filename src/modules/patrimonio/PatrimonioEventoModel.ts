import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export type PatrimonioEventoTipo =
  | 'cadastro'
  | 'emprestimo'
  | 'devolucao'
  | 'manutencao_entrada'
  | 'manutencao_saida'
  | 'transferencia'
  | 'baixa'
  | 'reativacao';

export interface IPatrimonioEvento {
  patrimonio: mongoose.Types.ObjectId;
  tipo: PatrimonioEventoTipo;
  status_anterior?: string | null;
  status_novo: string;
  localizacao_anterior?: mongoose.Types.ObjectId;
  localizacao_nova?: mongoose.Types.ObjectId;
  emprestimo?: mongoose.Types.ObjectId;
  data_hora: Date;
  observacoes?: string;
  usuario: string;
}

// Ledger imutável: sem rotas de update/delete. É o histórico de patrimônio,
// análogo a `Movimentacao` para consumo — mas registra transição de
// status/localização, não delta de quantidade.
export type PatrimonioEventoDocument = IPatrimonioEvento & Document;

const patrimonioEventoSchema = new mongoose.Schema<PatrimonioEventoDocument>({
  patrimonio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'patrimonios',
    required: true,
    index: true,
  },
  tipo: {
    type: String,
    enum: [
      'cadastro',
      'emprestimo',
      'devolucao',
      'manutencao_entrada',
      'manutencao_saida',
      'transferencia',
      'baixa',
      'reativacao',
    ],
    required: true,
  },
  status_anterior: { type: String, required: false, default: null },
  status_novo: { type: String, required: true },
  localizacao_anterior: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'localizacoes',
    required: false,
  },
  localizacao_nova: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'localizacoes',
    required: false,
  },
  emprestimo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'emprestimos',
    required: false,
  },
  data_hora: { type: Date, required: true, default: Date.now },
  observacoes: { type: String, required: false },
  usuario: { type: String, ref: 'usuarios', required: true },
});

patrimonioEventoSchema.index({ patrimonio: 1, data_hora: -1 });

patrimonioEventoSchema.plugin(mongoosePaginate);

export default mongoose.model<
  PatrimonioEventoDocument,
  mongoose.PaginateModel<PatrimonioEventoDocument>
>('patrimonio_eventos', patrimonioEventoSchema);
