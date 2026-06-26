import { fakeMappings } from './globalFakeMapping.js';
import Localizacao from '../modules/localizacao/LocalizacaoModel.js';

export default async function localizacaoSeed(adminId: string) {
  await Localizacao.deleteMany({});

  for (let i = 0; i < 10; i++) {
    const localizacao = {
      nome: fakeMappings.Localizacao.nome(),
      usuario: adminId,
      ativo: true,
    };

    await Localizacao.create(localizacao);
  }
}
