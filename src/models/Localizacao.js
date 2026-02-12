import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Localizacao {
    constructor() {
        const localizacaoSchema = new mongoose.Schema({
            nome: {
                type: String,
                required: true
            },
            ativo: {
                type: Boolean,
                default: true
            },
            usuario: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'usuarios',
                required: true
            }
        });

        localizacaoSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("localizacoes", localizacaoSchema);
    };
};

export default new Localizacao().model;