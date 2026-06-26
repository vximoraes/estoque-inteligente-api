import { fakeMappings } from './globalFakeMapping.js';
import Notificacao from '../modules/notificacao/NotificacaoModel.js';

export default async function notificacaoSeed(adminId: string) {
  await Notificacao.deleteMany({});

  for (let i = 0; i < 10; i++) {
    const notificacao = {
      mensagem: fakeMappings.Notificacao.mensagem(),
      data_hora: fakeMappings.Notificacao.data_hora(),
      visualizada: fakeMappings.Notificacao.visualizada(),
      usuario: adminId,
    };
    await Notificacao.create(notificacao);
  }
}
