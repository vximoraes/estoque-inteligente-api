
import RotaRepository from "../repositories/RotaRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";

class RotaService {
    constructor(){
        this.repository = new RotaRepository()
    }

    async listar(req){

        const data = await this.repository.listar(req)
        return data
    }

    async criar(req){
        console.log('Estou no criar em RotaService')
        const rota = await this.repository.buscarRotaPorNome(req.rota)
        if(rota){
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorTypes: "resourceConflict",
                field: "Rotas",
                details: [],
                customMessage: messages.error.resourceConflict("Rotas", "rotas duplicadas")
            })
        }
        const data = await this.repository.criar(req)
        return data
    }

    async atualizar(req, id) {
        const rota = await this.repository.buscarRotaPorNome(req.rota, id)
        if (rota) {
            throw new CustomError({
                statusCode: HttpStatusCodes.CONFLICT.code,
                errorTypes: "resourceConflict",
                field: "Rotas",
                details: [],
                customMessage: messages.error.resourceConflict("Rotas", "rotas duplicadas")
            })
        }
        const data = await this.repository.atualizar(req, id)
        return data
    }

    async deletar(req, id) {
       const rota = await this.repository.buscarPorId(id)
       if(!rota){
           throw new CustomError({
               statusCode: HttpStatusCodes.NOT_FOUND.code,
               errorTypes: "resourceNotFound",
               field: "Rotas",
               details: [],
               customMessage: messages.error.resourceNotFound("Rota")
           })
           
       }
       const rotaAtual = req.route.path.replace(/\//g, '')
       if(rotaAtual === rota.rota || rotaAtual.includes(rota.rota)){
           throw new CustomError({
               statusCode: HttpStatusCodes.FORBIDDEN.code,
               errorTypes: "resourceNotFound",
               field: "Rotas",
               details: [],
               customMessage: messages.error.forbidden("Não pode deletar a rota atual")
           })        
       }
       const data = await this.repository.deletar(id)
       return data
    }
}
export default RotaService