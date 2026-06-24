import { fakeMappings } from './globalFakeMapping.js';
import Item from '../modules/item/ItemModel.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function itemSeed(adminId) {
  const categoriaList = await Categoria.find({});

  await Item.deleteMany({});

  const nomesFixos = fakeMappings.Item.nomesFixos;
  for (const nome of nomesFixos) {
    const categoriaRandom =
      categoriaList[Math.floor(Math.random() * categoriaList.length)];

    const item = {
      nome,
      quantidade: 0,
      estoque_minimo: fakeMappings.Item.estoque_minimo.apply(),
      descricao: fakeMappings.Item.descricao.apply(),
      // imagem: fakeMappings.Item.imagem.apply(),
      categoria: categoriaRandom._id,
      usuario: adminId,
      ativo: fakeMappings.Item.ativo.apply(),
      status: fakeMappings.Item.status.apply(),
    };

    await Item.create(item);
  }
}
