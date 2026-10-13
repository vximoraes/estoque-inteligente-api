import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buscarItens } from '../buscarItens.js';
import CategoriaModel from '../../../../modules/categoria/CategoriaModel.js';
import ItemModel from '../../../../modules/item/ItemModel.js';
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

describe('buscarItens', () => {
  it('informa se o item tem imagem e quem o cadastrou', async () => {
    const usuario = await UsuarioModel.create({
      nome: 'Admin Teste',
      email: 'admin-item@teste.com',
    });
    const usuarioId = usuario._id.toString();
    const categoria = await CategoriaModel.create({
      nome: 'Periféricos',
      tipo: 'consumo',
      usuario: usuarioId,
    });
    await ItemModel.create({
      nome: 'Mouse Logitech MX Master',
      categoria: categoria._id,
      usuario: usuarioId,
      quantidade: 10,
      quantidade_disponivel: 10,
      imagem: 'itens/mouse.webp',
    });

    const { registros } = await buscarItens({}, usuarioId);

    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      nome: 'Mouse Logitech MX Master',
      possui_imagem: true,
      cadastrado_por: 'Admin Teste',
    });
    expect(registros[0]).not.toHaveProperty('imagem');
  });
});
