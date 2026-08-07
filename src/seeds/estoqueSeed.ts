import mongoose from 'mongoose';
import { fakeMappings } from './globalFakeMapping.js';
import Estoque from '../modules/estoque/EstoqueModel.js';
import Item from '../modules/item/ItemModel.js';
import Localizacao, { type LocalizacaoDocument } from '../modules/localizacao/LocalizacaoModel.js';
import Usuario from '../modules/usuario/UsuarioModel.js';

export default async function estoqueSeed() {
  const itemList = await Item.find({});
  const localizacaoList = await Localizacao.find({});
  const usuarios = await Usuario.find({});

  await Estoque.deleteMany({});

  for (const item of itemList) {
    const numLocalizacoes = Math.floor(Math.random() * 3) + 1;
    const localizacoesSelecionadas: LocalizacaoDocument[] = [];

    for (let i = 0; i < numLocalizacoes; i++) {
      let localizacaoRandom: LocalizacaoDocument | undefined;
      do {
        localizacaoRandom =
          localizacaoList[Math.floor(Math.random() * localizacaoList.length)];
      } while (
        localizacoesSelecionadas.some(
          (loc) => String(loc._id) === String(localizacaoRandom?._id),
        )
      );

      if (localizacaoRandom) localizacoesSelecionadas.push(localizacaoRandom);
    }

    for (const localizacao of localizacoesSelecionadas) {
      const usuarioRandom =
        usuarios[Math.floor(Math.random() * usuarios.length)]!;

      const estoque = {
        quantidade: fakeMappings.Estoque.quantidade(),
        item: item._id,
        localizacao: localizacao._id,
        usuario: String(usuarioRandom._id),
      };

      await Estoque.create(estoque);
    }
  }

  for (const item of itemList) {
    await Estoque.atualizarQuantidadeItem(item._id as mongoose.Types.ObjectId);
  }
}
