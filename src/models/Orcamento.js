import mongoose from "mongoose"
import mongoosePaginate from "mongoose-paginate-v2"

class Orcamento {
    constructor() {
        const orcamentoSchema = new mongoose.Schema({
            nome: {
                type: String,
                index: true,
                required: true
            },
            descricao: {
                type: String,
                required: false
            },
            total: {
                type: Number,
                default: 0
            },
            componentes: [
                {
                    componente: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'componentes',
                        required: true
                    },
                    nome: {
                        type: String,
                        required: true
                    },
                    fornecedor: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'fornecedores',
                        required: true
                    },
                    quantidade: {
                        type: Number,
                        required: true,
                        min: 1,
                        max: 999999999
                    },
                    valor_unitario: {
                        type: Number,
                        required: true,
                        min: 0
                    },
                    subtotal: {
                        type: Number,
                        default: 0,
                        min: 0
                    }
                }
            ],
            usuario: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'usuarios',
                required: true
            },
            ativo: {
                type: Boolean,
                default: true
            }
        }, {
            timestamps: true // Adiciona createdAt e updatedAt automaticamente
        });

        // Middleware para calcular subtotal e total antes de salvar
        orcamentoSchema.pre('save', function() {
            // Calcular subtotal para cada componente
            this.componentes.forEach(comp => {
                comp.subtotal = parseFloat((comp.quantidade * comp.valor_unitario).toFixed(2));
            });
            
            // Calcular total do orçamento
            this.total = parseFloat(this.componentes.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2));
        });

        // Middleware para recalcular após update
        orcamentoSchema.pre(['updateOne', 'findOneAndUpdate'], function() {
            const update = this.getUpdate();
            if (update.componentes) {
                // Calcular subtotal para cada componente
                update.componentes.forEach(comp => {
                    comp.subtotal = parseFloat((comp.quantidade * comp.valor_unitario).toFixed(2));
                });
                
                // Calcular total do orçamento
                update.total = parseFloat(update.componentes.reduce((acc, comp) => acc + comp.subtotal, 0).toFixed(2));
            }
        });

        orcamentoSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("orcamentos", orcamentoSchema);
    };
};

export default new Orcamento().model;