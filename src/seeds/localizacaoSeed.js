import { fakeMappings } from "./globalFakeMapping.js";
import Localizacao from "../models/Localizacao.js";
import Usuario from "../models/Usuario.js";

export default async function localizacaoSeed(adminId) {
    await Localizacao.deleteMany({});

    for (let i = 0; i < 10; i++) {
        const localizacao = {
            nome: fakeMappings.Localizacao.nome.apply(),
            usuario: adminId,
            ativo: true
        };

        await Localizacao.create(localizacao);
    };
};