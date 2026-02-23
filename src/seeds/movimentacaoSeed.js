import { fakeMappings } from './globalFakeMapping.js';
import Movimentacao from '../models/Movimentacao.js';
import Item from '../models/Item.js';
import Localizacao from '../models/Localizacao.js';

export default async function movimentacaoSeed(adminId) {
  const itemList = await Item.find({});
  const localizacaoList = await Localizacao.find({});

  await Movimentacao.deleteMany({});

  for (let i = 0; i < 20; i++) {
    const tipo = fakeMappings.Movimentacao.tipo.apply();
    const itemRandom = itemList[Math.floor(Math.random() * itemList.length)];
    const localizacaoRandom =
      localizacaoList[Math.floor(Math.random() * localizacaoList.length)];

    const movimentacao = {
      tipo,
      data_hora: fakeMappings.Movimentacao.data_hora.apply(),
      quantidade: fakeMappings.Movimentacao.quantidade.apply(),
      item: itemRandom._id,
      localizacao: localizacaoRandom._id,
      usuario: adminId,
    };

    await Movimentacao.create(movimentacao);
  }
}
