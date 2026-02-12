import { fakeMappings } from './globalFakeMapping.js';
import Orcamento from '../models/Orcamento.js';
import Componente from '../models/Componente.js';
import Fornecedor from '../models/Fornecedor.js';

export default async function orcamentoSeed(adminId) {
    const componenteList = await Componente.find({});
    const fornecedorList = await Fornecedor.find({});
    
    await Orcamento.deleteMany({});

    for (let i = 0; i < 5; i++) {
        const componentes = [];
        
        const numComponentes = Math.floor(Math.random() * 4) + 2;
        
        for (let j = 0; j < numComponentes; j++) {
            const componenteRandom = componenteList[Math.floor(Math.random() * componenteList.length)];
            const fornecedorRandom = fornecedorList[Math.floor(Math.random() * fornecedorList.length)];
            
            const quantidade = Math.floor(Math.random() * 10) + 1;
            const valor_unitario = parseFloat((Math.random() * 100 + 5).toFixed(2));
            
            componentes.push({
                componente: componenteRandom._id,
                nome: componenteRandom.nome, 
                fornecedor: fornecedorRandom._id,
                quantidade,
                valor_unitario,
                subtotal: quantidade * valor_unitario 
            });
        }
        
        const orcamento = {
            nome: fakeMappings.Orcamento.nome.apply(),
            descricao: fakeMappings.Orcamento.descricao.apply(),
            componentes,
            usuario: adminId,
            ativo: true
        };
        
        await Orcamento.create(orcamento);
    }
};