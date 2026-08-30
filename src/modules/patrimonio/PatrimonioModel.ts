import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ICampoPersonalizado {
  chave: string;
  valor: string;
}

export interface IPatrimonio {
  numero_patrimonio: string;
  modelo?: string;
  fabricante?: string;
  categoria: mongoose.Types.ObjectId;
  localizacao: mongoose.Types.ObjectId;
  status: 'Disponível' | 'Emprestado' | 'Manutenção' | 'Baixado';
  data_aquisicao?: Date;
  observacoes?: string;
  imagem?: string;
  campos_personalizados: ICampoPersonalizado[];
  ativo: boolean;
  usuario: string;
}

export type PatrimonioDocument = IPatrimonio & Document;

export type IPatrimonioModel = mongoose.PaginateModel<PatrimonioDocument>;

// `_id: false`: a ordem do array é a identidade do campo — o editor da UI
// sempre reescreve a lista inteira, então subdocumentos com id próprio só
// gerariam churn sem servir a nenhuma consulta.
const campoPersonalizadoSchema = new mongoose.Schema<ICampoPersonalizado>(
  {
    chave: { type: String, required: true, trim: true, maxlength: 50 },
    valor: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const patrimonioSchema = new mongoose.Schema<PatrimonioDocument>(
  {
    numero_patrimonio: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    modelo: { type: String, required: false, trim: true, maxlength: 100 },
    fabricante: { type: String, required: false, trim: true, maxlength: 100 },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categorias',
      required: true,
      index: true,
    },
    localizacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'localizacoes',
      required: true,
    },
    status: {
      type: String,
      enum: ['Disponível', 'Emprestado', 'Manutenção', 'Baixado'],
      default: 'Disponível',
      required: true,
      index: true,
    },
    data_aquisicao: { type: Date, required: false },
    observacoes: { type: String, required: false },
    imagem: { type: String, required: false },
    campos_personalizados: { type: [campoPersonalizadoSchema], default: [] },
    ativo: { type: Boolean, default: true },
    usuario: { type: String, ref: 'usuarios', required: true },
  },
  { timestamps: true },
);

// Índice único parcial: só entre unidades ativas — permite reaproveitar o
// número de patrimônio se o cadastro original foi inativado por engano.
patrimonioSchema.index(
  { numero_patrimonio: 1 },
  { unique: true, partialFilterExpression: { ativo: true } },
);
patrimonioSchema.index({ categoria: 1, status: 1 });
patrimonioSchema.index({ localizacao: 1 });

// `status` e `localizacao` só devem mudar através de PatrimonioService
// (criar/transicionar/transferir/emprestarUnidade/devolverUnidade), nunca
// por um PATCH genérico direto no repository — é o que garante que toda
// mudança de estado gere um PatrimonioEvento correspondente.

patrimonioSchema.plugin(mongoosePaginate);

export default mongoose.model<PatrimonioDocument, IPatrimonioModel>(
  'patrimonios',
  patrimonioSchema,
);
