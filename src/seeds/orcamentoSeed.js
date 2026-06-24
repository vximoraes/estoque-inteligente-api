import { fakeMappings } from './globalFakeMapping.js';
import Orcamento from '../modules/orcamento/OrcamentoModel.js';
import Item from '../modules/item/ItemModel.js';
import Fornecedor from '../modules/fornecedor/FornecedorModel.js';

export default async function orcamentoSeed(adminId) {
  const itemList = await Item.find({});
  const fornecedorList = await Fornecedor.find({});

  await Orcamento.deleteMany({});

  for (let i = 0; i < 5; i++) {
    const itens = [];

    const numItens = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < numItens; j++) {
      const itemRandom = itemList[Math.floor(Math.random() * itemList.length)];
      const fornecedorRandom =
        fornecedorList[Math.floor(Math.random() * fornecedorList.length)];

      const quantidade = Math.floor(Math.random() * 10) + 1;
      const valor_unitario = parseFloat((Math.random() * 100 + 5).toFixed(2));

      itens.push({
        item: itemRandom._id,
        nome: itemRandom.nome,
        fornecedor: fornecedorRandom._id,
        quantidade,
        valor_unitario,
        subtotal: quantidade * valor_unitario,
      });
    }

    const orcamento = {
      nome: fakeMappings.Orcamento.nome.apply(),
      descricao: fakeMappings.Orcamento.descricao.apply(),
      itens,
      usuario: adminId,
      ativo: true,
    };

    await Orcamento.create(orcamento);
  }
}
