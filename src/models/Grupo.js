import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

class Grupo {
  constructor() {
    const grupoSchema = new mongoose.Schema(
      {
        nome: { type: String, index: true, unique: true },
        descricao: { type: String, required: true },
        ativo: { type: Boolean, default: true },
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
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    // rota + dominio devem ser únicos dentro do mesmo grupo
    grupoSchema.pre('save', function (next) {
      const permissoes = this.permissoes;
      const combinacoes = permissoes.map((p) => `${p.rota}_${p.dominio}`);
      const setCombinacoes = new Set(combinacoes);

      if (combinacoes.length !== setCombinacoes.size) {
        return next(
          new Error(
            'Permissões duplicadas encontradas: rota + domínio devem ser únicos dentro de cada grupo.',
          ),
        );
      }

      next();
    });

    grupoSchema.plugin(mongoosePaginate);

    this.model = mongoose.model('grupos', grupoSchema);
  }
}

export default new Grupo().model;
