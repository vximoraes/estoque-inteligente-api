import { fakeMappings } from './globalFakeMapping.js';
import Item from '../modules/item/ItemModel.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function itemSeed(adminId: string) {
  const categoriaList = await Categoria.find({ tipo: 'consumo' });

  await Item.deleteMany({});

  // Itens de consumo (controle por quantidade agregada): estoque_minimo
  // aleatório de verdade, como antes.
  for (const { nome, categoria: categoriaNome } of fakeMappings.Item
    .nomesConsumo) {
    const categoria = categoriaList.find((c) => c.nome === categoriaNome)!;

    await Item.create({
      nome,
      tipo: 'consumo',
      quantidade: 0,
      estoque_minimo: fakeMappings.Item.estoque_minimo(),
      descricao: fakeMappings.Item.descricao(nome),
      categoria: categoria._id,
      usuario: adminId,
      ativo: fakeMappings.Item.ativo(),
      status: fakeMappings.Item.status(),
    });
  }
}
