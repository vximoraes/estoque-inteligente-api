import Grupo from "../models/Grupo.js";
import { fakeMappings } from "./globalFakeMapping.js";

export default async function seedGrupos(rotas) {
    await Grupo.deleteMany();

    const grupos = [];

    const grupoAdministrador = {
        nome: "Administrador",
        descricao: "Grupo com acesso total a todas as rotas",
        ativo: true,
        permissoes: rotas.map((r) => ({ ...r.toObject(), _id: r._id })),
    };
    grupos.push(grupoAdministrador);

    const grupoVisitante = {
        nome: "Usuario",
        descricao: "Grupo com acesso aos visualização de pontos históricos",
        ativo: true,
        permissoes: rotas.map((r) => {
            if (r.rota === "usuarios" || r.rota === "usuarios:id" || r.rota ==="grupos" || r.rota ==="grupos:id" || r.rota === "rotas" || r.rota ==="rotas:id") {
                return {
                    ...r.toObject(),
                    _id: r._id,
                    ativo: false,
                    buscar: false,
                    enviar: false,
                    modificar: false,
                    substituir: false,
                    excluir: false
                };
            }
            return {
                ...r.toObject(),
                _id: r._id,
                buscar: true,
                enviar: true,
                modificar: true,
                substituir: true,
                excluir: true,
            };
        }),
    };
    grupos.push(grupoVisitante);

    const result = await Grupo.collection.insertMany(grupos);

    // Retorna grupos atualizados
    return Grupo.find();
}