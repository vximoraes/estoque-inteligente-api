import mongoose from 'mongoose';
import Fornecedor from '../FornecedorModel.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await Fornecedor.deleteMany({});
});

describe('Modelo de Fornecedor', () => {
  it('deve criar um fornecedor com nome válido e único', async () => {
    const fornecedorData = {
      nome: 'Fornecedor A',
      usuario: new mongoose.Types.ObjectId(),
    };
    const fornecedor = new Fornecedor(fornecedorData);
    await fornecedor.save();
    const saved = await Fornecedor.findById(fornecedor._id);
    expect(saved.nome).toBe(fornecedorData.nome);
    expect(saved._id).toBeDefined();
  });

  it('não deve criar fornecedor sem nome', async () => {
    const fornecedor = new Fornecedor({
      usuario: new mongoose.Types.ObjectId(),
    });
    await expect(fornecedor.save()).rejects.toThrow();
  });

  it('deve retornar todos os fornecedores cadastrados', async () => {
    const f1 = new Fornecedor({
      nome: 'Fornecedor C',
      usuario: new mongoose.Types.ObjectId(),
    });
    const f2 = new Fornecedor({
      nome: 'Fornecedor D',
      usuario: new mongoose.Types.ObjectId(),
    });
    await f1.save();
    await f2.save();
    const fornecedores = await Fornecedor.find();
    expect(fornecedores.length).toBe(2);
    const nomes = fornecedores.map((f) => f.nome);
    expect(nomes).toContain('Fornecedor C');
    expect(nomes).toContain('Fornecedor D');
  });

  it('deve atualizar o nome de um fornecedor', async () => {
    const fornecedor = new Fornecedor({
      nome: 'Fornecedor E',
      usuario: new mongoose.Types.ObjectId(),
    });
    await fornecedor.save();
    fornecedor.nome = 'Fornecedor E Atualizado';
    await fornecedor.save();
    const updated = await Fornecedor.findById(fornecedor._id);
    expect(updated.nome).toBe('Fornecedor E Atualizado');
  });

  it('deve remover um fornecedor existente', async () => {
    const fornecedor = new Fornecedor({
      nome: 'Fornecedor H',
      usuario: new mongoose.Types.ObjectId(),
    });
    await fornecedor.save();
    await Fornecedor.findByIdAndDelete(fornecedor._id);
    const found = await Fornecedor.findById(fornecedor._id);
    expect(found).toBeNull();
  });
});
