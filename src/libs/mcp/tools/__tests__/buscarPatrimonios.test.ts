import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buscarPatrimonios } from '../buscarPatrimonios.js';
import CategoriaModel from '../../../../modules/categoria/CategoriaModel.js';
import LocalizacaoModel from '../../../../modules/localizacao/LocalizacaoModel.js';
import PatrimonioModel from '../../../../modules/patrimonio/PatrimonioModel.js';
import UsuarioModel from '../../../../modules/usuario/UsuarioModel.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('buscarPatrimonios', () => {
  it('informa se a unidade tem imagem e quem a cadastrou', async () => {
    const usuario = await UsuarioModel.create({
      nome: 'Admin Teste',
      email: 'admin-patrimonio@teste.com',
    });
    const usuarioId = usuario._id.toString();
    const categoria = await CategoriaModel.create({
      nome: 'Rede',
      tipo: 'permanente',
      usuario: usuarioId,
    });
    const localizacao = await LocalizacaoModel.create({
      nome: 'Sala dos Professores',
      usuario: usuarioId,
    });
    const base = {
      modelo: 'Access Point Ubiquiti U6 Lite',
      categoria: categoria._id,
      localizacao: localizacao._id,
      status: 'Disponível',
      usuario: usuarioId,
    };
    await PatrimonioModel.create([
      {
        ...base,
        numero_patrimonio: 'ACP-0001',
        imagem: 'patrimonios/acp1.webp',
      },
      { ...base, numero_patrimonio: 'ACP-0002' },
    ]);

    const { registros } = await buscarPatrimonios({}, usuarioId);

    expect(registros).toHaveLength(2);
    expect(registros[0]).toMatchObject({
      numero_patrimonio: 'ACP-0001',
      possui_imagem: true,
      cadastrado_por: 'Admin Teste',
    });
    expect(registros[0]?.cadastrado_em).toBeInstanceOf(Date);
    expect(registros[1]).toMatchObject({
      numero_patrimonio: 'ACP-0002',
      possui_imagem: false,
    });
    expect(registros[0]).not.toHaveProperty('imagem');
  });
});
