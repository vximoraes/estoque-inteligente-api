import mongoose, { type Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import SSEService from '../../utils/services/SSEService.js';
import Grupo from '../grupo/GrupoModel.js';
import Usuario from '../usuario/UsuarioModel.js';

export interface IEstoque {
  quantidade: number;
  item: mongoose.Types.ObjectId;
  localizacao: mongoose.Types.ObjectId;
  usuario: mongoose.Types.ObjectId;
}

export type EstoqueDocument = IEstoque & Document;

export interface IEstoqueModel extends mongoose.PaginateModel<EstoqueDocument> {
  atualizarQuantidadeItem(itemId: mongoose.Types.ObjectId): Promise<void>;
}

const estoqueSchema = new mongoose.Schema<EstoqueDocument>(
  {
    quantidade: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 999999999,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'itens',
      required: true,
    },
    localizacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'localizacoes',
      required: true,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'usuarios',
      required: true,
    },
  },
  { timestamps: true },
);

estoqueSchema.index({ item: 1, localizacao: 1 }, { unique: true });

estoqueSchema.post('save', async function (this: EstoqueDocument) {
  if (this.$session()) return;
  const Model = this.constructor as unknown as IEstoqueModel;
  await Model.atualizarQuantidadeItem(this.item);
});

estoqueSchema.post<mongoose.Query<EstoqueDocument | null, EstoqueDocument>>(
  'findOneAndDelete',
  async function (doc) {
    if (doc && 'item' in doc) {
      const model = this.model as unknown as IEstoqueModel;
      await model.atualizarQuantidadeItem(doc.item);
    }
  },
);

estoqueSchema.post(
  ['updateOne', 'findOneAndUpdate'],
  async function (this: mongoose.Query<unknown, EstoqueDocument>) {
    if (this.getOptions().session) return;
    const model = this.model as unknown as IEstoqueModel;
    const doc = await model.findOne(
      this.getQuery() as mongoose.FilterQuery<EstoqueDocument>,
    );
    if (doc && 'item' in doc) {
      await model.atualizarQuantidadeItem(doc.item);
    }
  },
);

async function quemRecebeAvisoDeEstoque(): Promise<mongoose.Types.ObjectId[]> {
  const acessoAItens = {
    $elemMatch: { rota: 'itens', ativo: true, buscar: true },
  };
  const grupos = await Grupo.find(
    { ativo: true, permissoes: acessoAItens },
    '_id',
  ).lean();
  const usuarios = await Usuario.find(
    {
      ativo: true,
      desativadoEm: null,
      $or: [
        { grupos: { $in: grupos.map((grupo) => grupo._id) } },
        { permissoes: acessoAItens },
      ],
    },
    '_id',
  ).lean();
  return usuarios.map((usuario) => usuario._id as mongoose.Types.ObjectId);
}

estoqueSchema.statics['atualizarQuantidadeItem'] = async function (
  this: unknown,
  itemId: mongoose.Types.ObjectId,
) {
  const self = this as IEstoqueModel;
  const Item = mongoose.model('itens');
  const Notificacao = mongoose.model('notificacoes');

  const resultado = (await self.aggregate([
    { $match: { item: itemId } },
    { $group: { _id: null, quantidadeTotal: { $sum: '$quantidade' } } },
  ])) as Array<{ quantidadeTotal: number }>;

  const quantidadeTotal =
    resultado.length > 0 ? (resultado[0]?.quantidadeTotal ?? 0) : 0;

  const item = (await Item.findById(itemId)) as Record<string, unknown> | null;

  if (item) {
    const quantidadeAnterior = (item['quantidade'] as number) || 0;
    const estoqueMinimo = (item['estoque_minimo'] as number) || 0;
    const nomeItem = item['nome'] as string;

    await Item.findByIdAndUpdate(itemId, {
      quantidade: quantidadeTotal,
      quantidade_disponivel: quantidadeTotal,
    });

    let mensagem: string | null = null;

    if (quantidadeTotal === 0 && quantidadeAnterior > 0) {
      mensagem = `${nomeItem} está indisponível (0 unidades)`;
    } else if (
      quantidadeTotal >= estoqueMinimo &&
      quantidadeAnterior < estoqueMinimo
    ) {
      mensagem = `${nomeItem} está em estoque (${quantidadeTotal} unidades)`;
    } else if (
      quantidadeTotal > 0 &&
      quantidadeTotal < estoqueMinimo &&
      quantidadeAnterior === 0
    ) {
      mensagem = `${nomeItem} está com estoque baixo (${quantidadeTotal} unidades)`;
    } else if (
      quantidadeTotal > 0 &&
      quantidadeTotal < estoqueMinimo &&
      quantidadeAnterior >= estoqueMinimo
    ) {
      mensagem = `${nomeItem} está com estoque baixo (${quantidadeTotal} unidades)`;
    }

    if (mensagem) {
      const destinatarios = await quemRecebeAvisoDeEstoque();
      const dataHora = new Date();
      const notificacoes = (await Notificacao.insertMany(
        destinatarios.map((usuario) => ({
          mensagem,
          data_hora: dataHora,
          visualizada: false,
          ativo: true,
          usuario,
        })),
      )) as unknown as Array<Record<string, unknown>>;

      for (const notificacao of notificacoes) {
        SSEService.sendNotification(String(notificacao['usuario']), {
          _id: notificacao['_id'],
          mensagem: notificacao['mensagem'],
          data_hora: notificacao['data_hora'],
          visualizada: notificacao['visualizada'],
        });
      }
    }
  }
};

estoqueSchema.plugin(mongoosePaginate);

export default mongoose.model<EstoqueDocument, IEstoqueModel>(
  'estoques',
  estoqueSchema,
);
