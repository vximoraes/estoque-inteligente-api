import { fakeMappings } from './globalFakeMapping.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';

export default async function localizacaoSeed(adminId: string) {
  await Localizacao.deleteMany({});

  for (let i = 0; i < fakeMappings.Localizacao.salas.length; i++) {
    const localizacao = {
      nome: fakeMappings.Localizacao.nome(i),
      usuario: adminId,
      ativo: true,
      descricao: fakeMappings.Localizacao.descricao(i),
    };

    await Localizacao.create(localizacao);
  }
}
