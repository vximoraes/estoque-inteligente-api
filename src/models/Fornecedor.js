import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Fornecedor {
    constructor() {
        const fornecedorSchema = new mongoose.Schema({
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
            },
            url: {
                type: String,
                required: false
            },
            contato: {
                type: String,
                required: false
            },
            descricao: {
                type: String,
                required: false
            }
        });

        fornecedorSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("fornecedores", fornecedorSchema);
    };
};

export default new Fornecedor().model;