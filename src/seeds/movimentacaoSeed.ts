import { fakeMappings } from './globalFakeMapping.js';
import Movimentacao from '../modules/movimentacao/MovimentacaoModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';

export default async function movimentacaoSeed(adminId: string) {
  const itemList = await Item.find({});
  const localizacaoList = await Localizacao.find({});

  await Movimentacao.deleteMany({});

  for (let i = 0; i < 20; i++) {
    const tipo = fakeMappings.Movimentacao.tipo();
    const itemRandom = itemList[Math.floor(Math.random() * itemList.length)]!;
    const localizacaoRandom =
      localizacaoList[Math.floor(Math.random() * localizacaoList.length)]!;

    const movimentacao = {
      tipo,
      data_hora: fakeMappings.Movimentacao.data_hora(),
      quantidade: fakeMappings.Movimentacao.quantidade(),
      item: itemRandom._id,
      localizacao: localizacaoRandom._id,
      usuario: adminId,
    };

    await Movimentacao.create(movimentacao);
  }
}
