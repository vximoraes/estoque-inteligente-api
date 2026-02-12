import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import SSEService from "../services/SSEService.js";

class Estoque {
    constructor() {
        const estoqueSchema = new mongoose.Schema({
            quantidade: {
                type: Number,
                required: true,
                default: 0,
                min: 0,
                max: 999999999
            },
            componente: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'componentes',
                required: true
            },
            localizacao: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'localizacoes',
                required: true
            },
            usuario: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'usuarios',
                required: true
            }
        }, {
            timestamps: true
        });

        // Index composto para garantir unicidade de componente por localização
        estoqueSchema.index({ componente: 1, localizacao: 1 }, { unique: true });

        // Middleware para atualizar quantidade total do componente após salvar
        estoqueSchema.post('save', async function() {
            await this.constructor.atualizarQuantidadeComponente(this.componente);
        });

        // Middleware para atualizar quantidade total do componente após remoção
        estoqueSchema.post('deleteOne', async function() {
            const doc = await this.model.findOne(this.getQuery());
            if (doc) {
                await this.model.atualizarQuantidadeComponente(doc.componente);
            }
        });

        // Middleware para atualizar quantidade total do componente após update
        estoqueSchema.post(['updateOne', 'findOneAndUpdate'], async function() {
            const doc = await this.model.findOne(this.getQuery());
            if (doc) {
                await this.model.atualizarQuantidadeComponente(doc.componente);
            }
        });

        // Método estático para atualizar quantidade total do componente
        estoqueSchema.statics.atualizarQuantidadeComponente = async function(componenteId) {
            const Componente = mongoose.model('componentes');
            const Notificacao = mongoose.model('notificacoes');
            
            // Soma todas as quantidades do componente em todas as localizações
            const resultado = await this.aggregate([
                { $match: { componente: componenteId } },
                { $group: { _id: null, quantidadeTotal: { $sum: '$quantidade' } } }
            ]);

            const quantidadeTotal = resultado.length > 0 ? resultado[0].quantidadeTotal : 0;

            // Buscar componente para verificar estoque mínimo e criar notificação
            const componente = await Componente.findById(componenteId);
            
            if (componente) {
                const quantidadeAnterior = componente.quantidade || 0;
                const estoqueMinimo = componente.estoque_minimo || 0;

                console.log('[DEBUG Notificação] quantidadeAnterior:', quantidadeAnterior, 'quantidadeTotal:', quantidadeTotal, 'estoqueMinimo:', estoqueMinimo);

                // Atualiza a quantidade total no componente
                await Componente.findByIdAndUpdate(componenteId, { quantidade: quantidadeTotal });

                // Criar notificações baseadas no status do estoque
                let mensagem = null;
                
                if (quantidadeTotal === 0 && quantidadeAnterior > 0) {
                    // Componente ficou indisponível
                    mensagem = `${componente.nome} está indisponível (0 unidades)`;
                } else if (quantidadeTotal >= estoqueMinimo && quantidadeAnterior < estoqueMinimo) {
                    // Componente voltou ao estoque normal (estava indisponível ou baixo estoque)
                    mensagem = `${componente.nome} está em estoque (${quantidadeTotal} unidades)`;
                } else if (quantidadeTotal > 0 && quantidadeTotal < estoqueMinimo && quantidadeAnterior === 0) {
                    // Componente saiu de indisponível para baixo estoque
                    mensagem = `${componente.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
                } else if (quantidadeTotal > 0 && quantidadeTotal < estoqueMinimo && quantidadeAnterior >= estoqueMinimo) {
                    // Componente ficou com estoque baixo (estava em estoque normal)
                    mensagem = `${componente.nome} está com estoque baixo (${quantidadeTotal} unidades)`;
                }

                console.log('[DEBUG Notificação] mensagem a criar:', mensagem);

                // Criar notificação se houver mensagem
                if (mensagem && componente.usuario) {
                    const novaNotificacao = await Notificacao.create({
                        mensagem,
                        data_hora: new Date(),
                        visualizada: false,
                        ativo: true,
                        usuario: componente.usuario
                    });

                    console.log('[DEBUG SSE] Enviando notificação para usuário:', componente.usuario.toString());

                    // Envia notificação via SSE para o usuário
                    SSEService.sendNotification(componente.usuario, {
                        _id: novaNotificacao._id,
                        mensagem: novaNotificacao.mensagem,
                        data_hora: novaNotificacao.data_hora,
                        visualizada: novaNotificacao.visualizada
                    });
                }
            }
        };

        estoqueSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("estoques", estoqueSchema);
    };
};

export default new Estoque().model;