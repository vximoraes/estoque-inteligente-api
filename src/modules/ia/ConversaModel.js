import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const MAX_MENSAGENS = 100;

class Conversa {
  constructor() {
    const mensagemSchema = new mongoose.Schema(
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

    const conversaSchema = new mongoose.Schema(
      {
        usuario: {
          type: mongoose.Schema.Types.ObjectId,
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
            validator(v) {
              return v.length <= MAX_MENSAGENS;
            },
            message: `Uma conversa não pode ter mais de ${MAX_MENSAGENS} mensagens.`,
          },
        },
      },
      {
        timestamps: { createdAt: 'criada_em', updatedAt: 'atualizada_em' },
      },
    );

    conversaSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('conversas', conversaSchema);
  }
}

export default new Conversa().model;
export { MAX_MENSAGENS };
