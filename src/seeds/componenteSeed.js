import { fakeMappings } from "./globalFakeMapping.js";
import Componente from "../models/Componente.js";
import Categoria from "../models/Categoria.js";
import Usuario from "../models/Usuario.js";

export default async function componenteSeed(adminId) {
    const categoriaList = await Categoria.find({});

    await Componente.deleteMany({});

    const nomesFixos = fakeMappings.Componente.nomesFixos;
    for (let nome of nomesFixos) {
        const categoriaRandom = categoriaList[Math.floor(Math.random() * categoriaList.length)];

        const componente = {
            nome,
            quantidade: 0,
            estoque_minimo: fakeMappings.Componente.estoque_minimo.apply(),
            descricao: fakeMappings.Componente.descricao.apply(),
            // imagem: fakeMappings.Componente.imagem.apply(),
            categoria: categoriaRandom._id,
            usuario: adminId,
            ativo: fakeMappings.Componente.ativo.apply(),
            status: fakeMappings.Componente.status.apply()
        };

        await Componente.create(componente);
    };
};