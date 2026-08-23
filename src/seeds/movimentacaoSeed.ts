import { fakeMappings } from './globalFakeMapping.js';
import Movimentacao from '../modules/movimentacao/MovimentacaoModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';

export default async function movimentacaoSeed(adminId: string) {
  // Item permanente não passa pelo ledger de movimentações — ver
  // `MovimentacaoService.criar`, que bloqueia esse caso na API.
  const itemList = await Item.find({ tipo: 'consumo' });
  const localizacaoList = await Localizacao.find({});

  await Movimentacao.deleteMany({});

  if (itemList.length === 0) return;

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
