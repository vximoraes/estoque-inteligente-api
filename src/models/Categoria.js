import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Categoria {
    constructor() {
        const categoriaSchema = new mongoose.Schema({
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

        categoriaSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("categorias", categoriaSchema);
    };
};

export default new Categoria().model;