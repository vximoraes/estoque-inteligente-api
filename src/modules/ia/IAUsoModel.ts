import mongoose, { type Document } from 'mongoose';

export type FinalizadoPor =
  | 'concluido'
  | 'erro'
  | 'cancelado'
  | 'tempo_esgotado'
  | 'limite_passos';

export interface IIAUso {
  usuario: string;
  conversa: mongoose.Types.ObjectId;
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  tokens_totais: number;
  tokens_pensamento: number;
  tokens_cache_leitura: number;
  custo_estimado_usd: number;
  passos_llm: number;
  ferramentas_chamadas: number;
  duracao_ms: number;
  finalizado_por: FinalizadoPor;
  criado_em?: Date;
}

export type IAUsoDocument = IIAUso & Document;

const iaUsoSchema = new mongoose.Schema<IAUsoDocument>(
  {
    usuario: { type: String, ref: 'usuarios', required: true, index: true },
    conversa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'conversas',
      required: true,
    },
    modelo: { type: String, required: true },
    tokens_entrada: { type: Number, default: 0 },
    tokens_saida: { type: Number, default: 0 },
    tokens_totais: { type: Number, default: 0 },
    tokens_pensamento: { type: Number, default: 0 },
    tokens_cache_leitura: { type: Number, default: 0 },
    custo_estimado_usd: { type: Number, default: 0 },
    passos_llm: { type: Number, default: 0 },
    ferramentas_chamadas: { type: Number, default: 0 },
    duracao_ms: { type: Number, default: 0 },
    finalizado_por: {
      type: String,
      enum: [
        'concluido',
        'erro',
        'cancelado',
        'tempo_esgotado',
        'limite_passos',
      ],
      required: true,
    },
  },
  { timestamps: { createdAt: 'criado_em', updatedAt: false } },
);

iaUsoSchema.index({ usuario: 1, criado_em: -1 });

export default mongoose.model<IAUsoDocument>('ia_usos', iaUsoSchema);
