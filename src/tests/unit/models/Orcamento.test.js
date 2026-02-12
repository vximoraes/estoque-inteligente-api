import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Orcamento from '../../../models/Orcamento.js';

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
    await Orcamento.deleteMany({});
});

describe('Model Orcamento', () => {
    it('deve cadastrar orçamento válido', async () => {
        const orcamento = await Orcamento.create({
            nome: 'Orçamento 1',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{
                componente: new mongoose.Types.ObjectId(),
                nome: 'Resistor',
                fornecedor: new mongoose.Types.ObjectId(),
                quantidade: 10,
                valor_unitario: 10,
            }],
        });
        expect(orcamento._id).toBeDefined();
        expect(orcamento.componentes.length).toBe(1);
        expect(orcamento.total).toBe(100);
    });

    it('não deve cadastrar orçamento sem campos obrigatórios', async () => {
        await expect(Orcamento.create({ usuario: new mongoose.Types.ObjectId() }))
            .rejects.toThrow();
    });

    it('deve calcular corretamente o valor total', async () => {
        const orcamento = await Orcamento.create({
            nome: 'Orçamento Soma',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [
                { componente: new mongoose.Types.ObjectId(), nome: 'A', fornecedor: new mongoose.Types.ObjectId(), quantidade: 2, valor_unitario: 10 },
                { componente: new mongoose.Types.ObjectId(), nome: 'B', fornecedor: new mongoose.Types.ObjectId(), quantidade: 4, valor_unitario: 10 },
            ],
        });
        expect(orcamento.total).toBe(60);
    });

    it('deve buscar orçamento por nome', async () => {
        await Orcamento.create({
            nome: 'BuscaNome',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ componente: new mongoose.Types.ObjectId(), nome: 'X', fornecedor: new mongoose.Types.ObjectId(), quantidade: 1, valor_unitario: 10 }],
        });
        const found = await Orcamento.findOne({ nome: 'BuscaNome' });
        expect(found).not.toBeNull();
        expect(found.nome).toBe('BuscaNome');
    });

    it('deve buscar orçamento por id', async () => {
        const orcamento = await Orcamento.create({
            nome: 'BuscaId',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ componente: new mongoose.Types.ObjectId(), nome: 'Y', fornecedor: new mongoose.Types.ObjectId(), quantidade: 2, valor_unitario: 10 }],
        });
        const found = await Orcamento.findById(orcamento._id);
        expect(found).not.toBeNull();
        expect(found.nome).toBe('BuscaId');
    });

    it('deve atualizar orçamento', async () => {
        const orcamento = await Orcamento.create({
            nome: 'Atualiza',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ componente: new mongoose.Types.ObjectId(), nome: 'Z', fornecedor: new mongoose.Types.ObjectId(), quantidade: 1, valor_unitario: 10 }],
        });
        orcamento.nome = 'Atualizado';
        await orcamento.save();
        const found = await Orcamento.findById(orcamento._id);
        expect(found.nome).toBe('Atualizado');
    });

    it('deve remover orçamento', async () => {
        const orcamento = await Orcamento.create({
            nome: 'Remove',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ componente: new mongoose.Types.ObjectId(), nome: 'W', fornecedor: new mongoose.Types.ObjectId(), quantidade: 1, valor_unitario: 10 }],
        });
        await Orcamento.findByIdAndDelete(orcamento._id);
        const found = await Orcamento.findById(orcamento._id);
        expect(found).toBeNull();
    });

    it('deve adicionar componente ao orçamento', async () => {
        const orcamento = await Orcamento.create({
            nome: 'AddComp',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ componente: new mongoose.Types.ObjectId(), nome: 'V', fornecedor: new mongoose.Types.ObjectId(), quantidade: 1, valor_unitario: 10 }],
        });
        orcamento.componentes.push({ 
            componente: new mongoose.Types.ObjectId(), 
            nome: 'Novo', 
            fornecedor: new mongoose.Types.ObjectId(), 
            quantidade: 2, 
            valor_unitario: 5 
        });
        await orcamento.save();
        const found = await Orcamento.findById(orcamento._id);
        expect(found.componentes.length).toBe(2);
        expect(found.total).toBe(20);
    });

    it('não deve permitir componente sem campos obrigatórios', async () => {
        await expect(Orcamento.create({
            nome: 'SemComp',
            usuario: new mongoose.Types.ObjectId(),
            componentes: [{ nome: 'Invalido' }],
        })).rejects.toThrow();
    });
});