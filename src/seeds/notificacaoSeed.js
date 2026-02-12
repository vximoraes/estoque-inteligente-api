import { fakeMappings } from './globalFakeMapping.js';
import Notificacao from '../models/Notificacao.js';
import Usuario from '../models/Usuario.js';

export default async function notificacaoSeed(adminId) {
    await Notificacao.deleteMany({});

    for (let i = 0; i < 10; i++) {
        const notificacao = {
            mensagem: fakeMappings.Notificacao.mensagem(),
            data_hora: fakeMappings.Notificacao.data_hora(),
            visualizada: fakeMappings.Notificacao.visualizada(),
            usuario: adminId
        };
        await Notificacao.create(notificacao);
    };
};