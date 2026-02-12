import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Movimentacao {
    constructor() {
        const movimentacaoSchema = new mongoose.Schema({
            tipo: {
                type: String,
                index: true,
                required: true,
                enum: { values: ["entrada", "saida"] },
            },
            data_hora: {
                type: Date,
                required: true,
                default: Date.now
            },
            quantidade: {
                type: Number,
                required: true,
                min: 0,
                max: 999999999
            },
            componente: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "componentes",
                required: true,
            },
            localizacao: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "localizacoes",
                required: true,
            },
            usuario: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'usuarios',
                required: true
            }
        });

        // Middleware para atualizar estoque após salvar movimentação
        movimentacaoSchema.post('save', async function() {
            await this.constructor.atualizarEstoque(this.componente, this.localizacao, this.usuario);
        });

        // Middleware para atualizar estoque após deletar movimentação
        movimentacaoSchema.post('deleteOne', async function() {
            const doc = await this.model.findOne(this.getQuery());
            if (doc) {
                await this.model.atualizarEstoque(doc.componente, doc.localizacao, doc.usuario);
            }
        });

        // Middleware para atualizar estoque após update
        movimentacaoSchema.post(['updateOne', 'findOneAndUpdate'], async function() {
            const doc = await this.model.findOne(this.getQuery());
            if (doc) {
                await this.model.atualizarEstoque(doc.componente, doc.localizacao, doc.usuario);
            }
        });

        // Método estático para atualizar estoque
        movimentacaoSchema.statics.atualizarEstoque = async function(componenteId, localizacaoId, usuarioId) {
            const EstoqueModel = mongoose.model('estoques');
            
            // Calcular quantidade total baseada nas movimentações
            const resultado = await this.aggregate([
                { 
                    $match: { 
                        componente: componenteId, 
                        localizacao: localizacaoId
                    } 
                },
                {
                    $group: {
                        _id: null,
                        quantidadeTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$tipo", "entrada"] },
                                    "$quantidade",
                                    { $multiply: ["$quantidade", -1] }
                                ]
                            }
                        }
                    }
                }
            ]);

            const quantidadeTotal = resultado.length > 0 ? Math.max(0, resultado[0].quantidadeTotal) : 0;

            // Atualizar ou criar registro de estoque
            await EstoqueModel.findOneAndUpdate(
                { 
                    componente: componenteId, 
                    localizacao: localizacaoId
                },
                { 
                    quantidade: quantidadeTotal,
                    usuario: usuarioId 
                },
                { 
                    upsert: true, 
                    new: true 
                }
            );

            // Atualizar quantidade total do componente
            await EstoqueModel.atualizarQuantidadeComponente(componenteId);
        };

        movimentacaoSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("movimentacoes", movimentacaoSchema);
    };
};

export default new Movimentacao().model;