import { fakeMappings } from './globalFakeMapping.js';
import Estoque from '../modules/estoque/EstoqueModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';
import Usuario from '../models/Usuario.js';

export default async function estoqueSeed() {
  const itemList = await Item.find({});
  const localizacaoList = await Localizacao.find({});
  const usuarios = await Usuario.find({});

  await Estoque.deleteMany({});

  for (const item of itemList) {
    const numLocalizacoes = Math.floor(Math.random() * 3) + 1;
    const localizacoesSelecionadas = [];

    for (let i = 0; i < numLocalizacoes; i++) {
      let localizacaoRandom;
      do {
        localizacaoRandom =
          localizacaoList[Math.floor(Math.random() * localizacaoList.length)];
      } while (
        localizacoesSelecionadas.some(
          (loc) => loc._id.toString() === localizacaoRandom._id.toString(),
        )
      );

      localizacoesSelecionadas.push(localizacaoRandom);
    }

    for (const localizacao of localizacoesSelecionadas) {
      const usuarioRandom =
        usuarios[Math.floor(Math.random() * usuarios.length)];

      const estoque = {
        quantidade: fakeMappings.Estoque.quantidade.apply(),
        item: item._id,
        localizacao: localizacao._id,
        usuario: usuarioRandom._id,
      };

      await Estoque.create(estoque);
    }
  }

  for (const item of itemList) {
    await Estoque.atualizarQuantidadeItem(item._id);
  }
}
