import { fakeMappings } from "./globalFakeMapping.js";
import Fornecedor from "../models/Fornecedor.js";
import Usuario from "../models/Usuario.js";

export default async function fornecedorSeed(adminId) {
    await Fornecedor.deleteMany({});

    for (let i = 0; i < 10; i++) {
        const fornecedor = {
            nome: fakeMappings.Fornecedor.nome.apply(),
            usuario: adminId,
            url: fakeMappings.Fornecedor.url.apply(),
            contato: fakeMappings.Fornecedor.contato.apply(),
            descricao: fakeMappings.Fornecedor.descricao.apply(),
            ativo: true
        };

        await Fornecedor.create(fornecedor);
    };
};