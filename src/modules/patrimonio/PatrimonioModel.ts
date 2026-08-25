import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import SSEService from '../../utils/services/SSEService.js';

export interface ICampoPersonalizado {
  chave: string;
  valor: string;
}

export interface IPatrimonio {
  item: mongoose.Types.ObjectId;
  numero_patrimonio: string;
  localizacao: mongoose.Types.ObjectId;
  status: 'Disponível' | 'Emprestado' | 'Manutenção' | 'Baixado';
  data_aquisicao?: Date;
  observacoes?: string;
  campos_personalizados: ICampoPersonalizado[];
  ativo: boolean;
  usuario: string;
}

export type PatrimonioDocument = IPatrimonio & Document;

export interface IPatrimonioModel
  extends mongoose.PaginateModel<PatrimonioDocument> {
  atualizarContadoresItem(itemId: mongoose.Types.ObjectId): Promise<void>;
}

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
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'itens',
      required: true,
      index: true,
    },
    numero_patrimonio: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
patrimonioSchema.index({ item: 1, status: 1 });
patrimonioSchema.index({ localizacao: 1 });

// `status` e `localizacao` só devem mudar através de PatrimonioService
// (criar/transicionar/transferir/emprestarUnidade/devolverUnidade), nunca
// por um PATCH genérico direto no repository — é o que garante que toda
// mudança de estado gere um PatrimonioEvento correspondente.

patrimonioSchema.post('save', async function (this: PatrimonioDocument) {
  const Model = this.constructor as unknown as IPatrimonioModel;
  await Model.atualizarContadoresItem(this.item);
});

patrimonioSchema.post(
  'deleteOne',
  async function (this: mongoose.Query<unknown, PatrimonioDocument>) {
    const model = this.model as unknown as IPatrimonioModel;
    const doc = await model.findOne(
      this.getQuery() as mongoose.FilterQuery<PatrimonioDocument>,
    );
    if (doc) {
      await model.atualizarContadoresItem(doc.item);
    }
  },
);

patrimonioSchema.post(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, PatrimonioDocument>) {
    const model = this.model as unknown as IPatrimonioModel;
    // Reconsulta só por `_id`, não pelo filtro original completo: updates
    // como `emprestarUnidade`/`devolverUnidade` filtram por `status` (o
    // mesmo campo que o update muda), então `this.getQuery()` deixa de
    // casar com o doc depois de salvo e o recálculo seria silenciosamente
    // pulado.
    const query = this.getQuery() as mongoose.FilterQuery<PatrimonioDocument>;
    const doc = await model.findOne({ _id: query['_id'] });
    if (doc) {
      await model.atualizarContadoresItem(doc.item);
    }
  },
);

patrimonioSchema.statics['atualizarContadoresItem'] = async function (
  this: unknown,
  itemId: mongoose.Types.ObjectId,
) {
  const self = this as IPatrimonioModel;
  const Item = mongoose.model('itens');
  const Notificacao = mongoose.model('notificacoes');

  const quantidade = await self.countDocuments({
    item: itemId,
    ativo: true,
    status: { $ne: 'Baixado' },
  });
  const quantidadeDisponivel = await self.countDocuments({
    item: itemId,
    ativo: true,
    status: 'Disponível',
  });

  const item = (await Item.findById(itemId)) as Record<string, unknown> | null;

  if (item) {
    const disponivelAnterior =
      (item['quantidade_disponivel'] as number) || 0;
    const nomeItem = item['nome'] as string;

    await Item.findByIdAndUpdate(itemId, {
      quantidade,
      quantidade_disponivel: quantidadeDisponivel,
    });

    if (
      quantidadeDisponivel === 0 &&
      disponivelAnterior > 0 &&
      item['usuario']
    ) {
      const novaNotificacao = (await Notificacao.create({
        mensagem: `Nenhuma unidade de ${nomeItem} disponível`,
        data_hora: new Date(),
        visualizada: false,
        ativo: true,
        usuario: item['usuario'],
      })) as Record<string, unknown>;

      SSEService.sendNotification(item['usuario'], {
        _id: novaNotificacao['_id'],
        mensagem: novaNotificacao['mensagem'],
        data_hora: novaNotificacao['data_hora'],
        visualizada: novaNotificacao['visualizada'],
      });
    }
  }
};

patrimonioSchema.plugin(mongoosePaginate);

export default mongoose.model<PatrimonioDocument, IPatrimonioModel>(
  'patrimonios',
  patrimonioSchema,
);
