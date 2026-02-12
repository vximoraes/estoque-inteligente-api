import mongoose from 'mongoose';
import Movimentacao from '../../../../src/models/Movimentacao.js';
import Componente from '../../../../src/models/Componente.js';
import Fornecedor from '../../../../src/models/Fornecedor.js';
import Estoque from '../../../../src/models/Estoque.js';  // Importar para registrar o modelo
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
    await Movimentacao.deleteMany({});
    await Componente.deleteMany({});
    await Fornecedor.deleteMany({});
});

describe('Modelo de Movimentacao', () => {
    let componente;
    let fornecedor;

    beforeEach(async () => {
        const userId = new mongoose.Types.ObjectId();
        componente = await Componente.create({
            nome: 'Resistor 1k',
            quantidade: 100,
            estoque_minimo: 10,
            categoria: new mongoose.Types.ObjectId(),
            usuario: userId
        });
        fornecedor = await Fornecedor.create({ 
            nome: 'Fornecedor Teste', 
            usuario: userId 
        });
    });

    it('deve criar uma movimentacao de entrada válida', async () => {
        const movData = {
            tipo: 'entrada',
            quantidade: 10,
            componente: componente._id,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await mov.save();
        const saved = await Movimentacao.findById(mov._id);
        expect(saved.tipo).toBe('entrada');
        expect(saved.componente.toString()).toBe(componente._id.toString());
        expect(saved.localizacao).toBeDefined();
    });

    it('deve falhar se localizacao não informada', async () => {
        const movData = {
            tipo: 'entrada',
            quantidade: 10,
            componente: componente._id,
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await expect(mov.save()).rejects.toThrow();
    });

    it('deve criar uma movimentacao de saida', async () => {
        const movData = {
            tipo: 'saida',
            quantidade: 5,
            componente: componente._id,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await mov.save();
        const saved = await Movimentacao.findById(mov._id);
        expect(saved.tipo).toBe('saida');
        expect(saved.fornecedor == null).toBe(true);
    });

    it('deve retornar todas as movimentacoes cadastradas', async () => {
        const userId = new mongoose.Types.ObjectId();
        const localizacao = new mongoose.Types.ObjectId();
        await Movimentacao.create({ tipo: 'entrada', quantidade: 10, componente: componente._id, localizacao, usuario: userId });
        await Movimentacao.create({ tipo: 'saida', quantidade: 5, componente: componente._id, localizacao, usuario: userId });
        const movs = await Movimentacao.find();
        expect(movs.length).toBe(2);
        const tipos = movs.map(m => m.tipo);
        expect(tipos).toContain('entrada');
        expect(tipos).toContain('saida');
    });

    it('deve remover uma movimentacao existente', async () => {
        const mov = await Movimentacao.create({ tipo: 'entrada', quantidade: 10, componente: componente._id, localizacao: new mongoose.Types.ObjectId(), usuario: new mongoose.Types.ObjectId() });
        await Movimentacao.findByIdAndDelete(mov._id);
        const found = await Movimentacao.findById(mov._id);
        expect(found).toBeNull();
    });

    it('não deve criar movimentacao sem tipo', async () => {
        const movData = {
            quantidade: 10,
            componente: componente._id,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await expect(mov.save()).rejects.toThrow();
    });

    it('não deve criar movimentacao sem componente', async () => {
        const movData = {
            tipo: 'entrada',
            quantidade: 10,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await expect(mov.save()).rejects.toThrow();
    });

    it('não deve criar movimentacao sem quantidade', async () => {
        const movData = {
            tipo: 'entrada',
            componente: componente._id,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await expect(mov.save()).rejects.toThrow();
    });

    it('não deve criar movimentacao com tipo inválido', async () => {
        const movData = {
            tipo: 'ajuste',
            quantidade: 10,
            componente: componente._id,
            localizacao: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const mov = new Movimentacao(movData);
        await expect(mov.save()).rejects.toThrow();
    });
});