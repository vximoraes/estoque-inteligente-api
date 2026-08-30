import { fakeMappings } from './globalFakeMapping.js';
import Item from '../modules/item/ItemModel.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function itemSeed(adminId: string) {
  const categoriaList = await Categoria.find({});
  const categoriasConsumo = categoriaList.filter((c) => c.tipo === 'consumo');

  await Item.deleteMany({});

  // Itens de consumo (controle por quantidade agregada): estoque_minimo
  // aleatório de verdade, como antes.
  for (const nome of fakeMappings.Item.nomesConsumo) {
    const categoriaRandom =
      categoriasConsumo[Math.floor(Math.random() * categoriasConsumo.length)]!;

    await Item.create({
      nome,
      tipo: 'consumo',
      quantidade: 0,
      estoque_minimo: fakeMappings.Item.estoque_minimo(),
      descricao: fakeMappings.Item.descricao(),
      categoria: categoriaRandom._id,
      usuario: adminId,
      ativo: fakeMappings.Item.ativo(),
      status: fakeMappings.Item.status(),
    });
  }
}
