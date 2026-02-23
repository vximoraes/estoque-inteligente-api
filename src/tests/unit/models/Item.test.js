import mongoose from 'mongoose';
import Item from '../../../../src/models/Item.js';
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
    await Item.deleteMany({});
});

describe('Modelo de Item', () => {
    it('deve criar um item com dados válidos', async () => {
        const itemData = {
            nome: 'Resistor 10k',
            estoque_minimo: 10,
            descricao: 'Resistor de 10k Ohms',
            imagem: 'http://exemplo.com/resistor.jpg',
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const item = new Item(itemData);
        await item.save();
        const saved = await Item.findById(item._id);
        expect(saved.nome).toBe(itemData.nome);
        expect(saved.quantidade).toBe(0);
        expect(saved.estoque_minimo).toBe(itemData.estoque_minimo);
        expect(saved.descricao).toBe(itemData.descricao);
        expect(saved.imagem).toBe(itemData.imagem);
        expect(saved.categoria.toString()).toBe(itemData.categoria.toString());
        expect(saved.ativo).toBe(true);
        expect(saved.status).toBe('Indisponível');
    });

    it('deve criar item com status padrão quando não informado', async () => {
        const itemData = {
            nome: 'Diodo LED',
            estoque_minimo: 10,
            valor_unitario: 0.25,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const item = new Item(itemData);
        await item.save();
        const saved = await Item.findById(item._id);
        expect(saved.status).toBe('Indisponível');
    });

    it('deve criar item com status específico', async () => {
        const itemData = {
            nome: 'Capacitor 100nF',
            estoque_minimo: 10,
            valor_unitario: 0.05,
            descricao: 'Capacitor de 100nF',
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId(),
            status: 'Baixo Estoque'
        };
        const item = new Item(itemData);
        await item.save();
        const saved = await Item.findById(item._id);
        expect(saved.status).toBe('Indisponível');
    });

    it('deve falhar ao criar item com status inválido', async () => {
        const itemData = {
            nome: 'Resistor 22k',
            estoque_minimo: 10,
            valor_unitario: 0.05,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            status: 'Status Inválido'
        };
        const item = new Item(itemData);
        await expect(item.save()).rejects.toThrow();
    });

    it('não deve criar item sem campos obrigatórios', async () => {
        const itemData = {
            estoque_minimo: 10,
            valor_unitario: 0.05,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId()
        };
        const item = new Item(itemData);
        await expect(item.save()).rejects.toThrow();
    });

    it('não deve criar item com nome duplicado', async () => {
        const baseData = {
            nome: 'Capacitor 100nF',
            estoque_minimo: 5,
            valor_unitario: 0.10,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        };
        const c1 = new Item(baseData);
        await c1.save();
        const c2 = new Item(baseData);
        await expect(c2.save()).rejects.toThrow();
    });

    it('deve retornar todos os itens cadastrados', async () => {
        const c1 = new Item({
            nome: 'Diodo',
            estoque_minimo: 3,
            valor_unitario: 0.20,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        });
        const c2 = new Item({
            nome: 'Transistor',
            estoque_minimo: 4,
            valor_unitario: 0.30,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId()
        });
        await c1.save();
        await c2.save();
        const itens = await Item.find();
        expect(itens.length).toBe(2);
        const nomes = itens.map(c => c.nome);
        expect(nomes).toContain('Diodo');
        expect(nomes).toContain('Transistor');
    });

    it('deve calcular status automaticamente baseado na quantidade e estoque_minimo', async () => {
        const itemData = {
            nome: 'Teste Status',
            estoque_minimo: 10,
            valor_unitario: 0.05,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId(),
            quantidade: 0
        };
        
        // Teste para quantidade = 0 (Indisponível)
        let item = new Item(itemData);
        await item.save();
        expect(item.status).toBe('Indisponível');
        
        // Teste para quantidade <= estoque_minimo (Baixo Estoque)
        item.quantidade = 5;
        await item.save();
        expect(item.status).toBe('Baixo Estoque');
        
        // Teste para quantidade > estoque_minimo (Em Estoque)
        item.quantidade = 15;
        await item.save();
        expect(item.status).toBe('Em Estoque');
    });

    it('deve atualizar status automaticamente em operações de update', async () => {
        const itemData = {
            nome: 'Teste Update Status',
            estoque_minimo: 10,
            valor_unitario: 0.05,
            localizacao: new mongoose.Types.ObjectId(),
            categoria: new mongoose.Types.ObjectId(),
            usuario: new mongoose.Types.ObjectId(),
            quantidade: 0
        };
        
        const item = new Item(itemData);
        await item.save();
        
        // Update via findOneAndUpdate
        await Item.findOneAndUpdate(
            { _id: item._id },
            { quantidade: 15 }
        );
        
        const updated = await Item.findById(item._id);
        expect(updated.status).toBe('Em Estoque');
    });
});