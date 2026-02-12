import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { required } from "zod/v4-mini";

class Usuario {
    constructor() {
        const usuarioSchema = new mongoose.Schema({
            nome: {
                type: String,
                index: true,
                required: true
            },
            email: {
                type: String,
                unique: true,
                required: true
            },
            senha: {
                type: String,
                select: false,
                required: false
            },
            ativo: {
                type: Boolean,
                default:
                    false
            },
            tokenUnico: { 
                type: String,
                select: false
            },
            tokenConvite: { 
                type: String,
                select: false
            },
            convidadoEm: { 
                type: Date,
                select: false
            },
            ativadoEm: { 
                type: Date,
                select: false
            },
            refreshtoken: {
                type: String,
                select: false
            },
            accesstoken: { 
                type: String,
                select: false
            },
            grupos:[{
                type:mongoose.Schema.Types.ObjectId,
                ref: 'grupos'
            }],
            permissoes: [
                {
                    rota: { type: String, index: true, required: true }, // usuários / grupos / unidades / rotas
                    dominio: { type: String }, // http://localhost:3000
                    ativo: { type: Boolean, default: false }, 
                    buscar: { type: Boolean, default: false },    
                    enviar: { type: Boolean, default: false },  
                    substituir: { type: Boolean, default: false },   
                    modificar: { type: Boolean, default: false },  
                    excluir: { type: Boolean, default: false }, 
                }
            ],
            fotoPerfil:{type:String, required:false}
        });

        usuarioSchema.plugin(mongoosePaginate);

        this.model = mongoose.model("usuarios", usuarioSchema);
    };
};

export default new Usuario().model;