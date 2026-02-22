import { fakeMappings } from './globalFakeMapping.js';
import Orcamento from '../models/Orcamento.js';
import Item from '../models/Item.js';
import Fornecedor from '../models/Fornecedor.js';

export default async function orcamentoSeed(adminId) {
    const itemList = await Item.find({});
    const fornecedorList = await Fornecedor.find({});
    
    await Orcamento.deleteMany({});

    for (let i = 0; i < 5; i++) {
        const items = [];
        
        const numItems = Math.floor(Math.random() * 4) + 2;
        
        for (let j = 0; j < numItems; j++) {
            const itemRandom = itemList[Math.floor(Math.random() * itemList.length)];
            const fornecedorRandom = fornecedorList[Math.floor(Math.random() * fornecedorList.length)];
            
            const quantidade = Math.floor(Math.random() * 10) + 1;
            const valor_unitario = parseFloat((Math.random() * 100 + 5).toFixed(2));
            
            items.push({
                item: itemRandom._id,
                nome: itemRandom.nome, 
                fornecedor: fornecedorRandom._id,
                quantidade,
                valor_unitario,
                subtotal: quantidade * valor_unitario 
            });
        }
        
        const orcamento = {
            nome: fakeMappings.Orcamento.nome.apply(),
            descricao: fakeMappings.Orcamento.descricao.apply(),
            items,
            usuario: adminId,
            ativo: true
        };
        
        await Orcamento.create(orcamento);
    }
};