import { fakeMappings } from './globalFakeMapping.js';
import Item from '../modules/item/ItemModel.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function itemSeed(adminId: string) {
  const categoriaList = await Categoria.find({});

  await Item.deleteMany({});

  const nomesFixos = fakeMappings.Item.nomesFixos;
  for (const nome of nomesFixos) {
    const categoriaRandom =
      categoriaList[Math.floor(Math.random() * categoriaList.length)]!;

    const item = {
      nome,
      quantidade: 0,
      estoque_minimo: fakeMappings.Item.estoque_minimo(),
      descricao: fakeMappings.Item.descricao(),
      // imagem: fakeMappings.Item.imagem(),
      categoria: categoriaRandom._id,
      usuario: adminId,
      ativo: fakeMappings.Item.ativo(),
      status: fakeMappings.Item.status(),
    };

    await Item.create(item);
  }
}
