import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Componente {
    constructor() {
        const componenteSchema = new mongoose.Schema({
            nome: {
                type: String,
                required: true
            },
            quantidade: {
                type: Number,
                required: false,
                default: 0,
                min: 0,
                max: 999999999
            },
            estoque_minimo: {
                type: Number,
                required: true,
                min: 0,
                max: 999999999
            },
            descricao: {
                type: String,
                required: false
            },
            imagem: {
                type: String,
                required: false
            },
            categoria: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "categorias", required: true
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
            status: {
                type: String,
                enum: ['Indisponível', 'Baixo Estoque', 'Em Estoque'],
                default: 'Indisponível',
                required: true
            },
        });

        // Middleware para calcular o status automaticamente
        componenteSchema.pre('save', function() {
            if (this.quantidade === 0) {
                this.status = 'Indisponível';
            } else if (this.quantidade < this.estoque_minimo) {
                this.status = 'Baixo Estoque';
            } else {
                this.status = 'Em Estoque';
            }
        });

        // Middleware para calcular o status em operações de update
        componenteSchema.pre(['updateOne', 'findOneAndUpdate'], async function() {
            const update = this.getUpdate();
            if (update.quantidade !== undefined || update.estoque_minimo !== undefined) {
                const docAtual = await this.model.findOne(this.getQuery());
                
                if (docAtual) {
                    const quantidade = update.quantidade !== undefined ? update.quantidade : docAtual.quantidade;
                    const estoque_minimo = update.estoque_minimo !== undefined ? update.estoque_minimo : docAtual.estoque_minimo;
                    
                    if (quantidade === 0) {
                        this.set({ status: 'Indisponível' });
                    } else if (quantidade < estoque_minimo) {
                        this.set({ status: 'Baixo Estoque' });
                    } else {
                        this.set({ status: 'Em Estoque' });
                    }
                }
            }
        });

        componenteSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("componentes", componenteSchema);
    };
};

export default new Componente().model;