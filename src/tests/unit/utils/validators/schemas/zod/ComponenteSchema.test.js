import { ComponenteSchema, ComponenteUpdateSchema } from '../../../../../../utils/validators/schemas/zod/ComponenteSchema.js';
import mongoose from 'mongoose';

describe('ComponenteSchema', () => {
    const objectId = new mongoose.Types.ObjectId().toString();

    it('deve validar dados válidos corretamente', () => {
        const dadosValidos = {
            nome: 'Resistor',
            estoque_minimo: '10',
            descricao: 'Resistor 1k',
            imagem: 'imagem.png',
            categoria: objectId,
            ativo: false,
        };
        const resultado = ComponenteSchema.parse(dadosValidos);
        expect(resultado.nome).toBe('Resistor');
        expect(resultado.estoque_minimo).toBe(10);
        expect(resultado.descricao).toBe('Resistor 1k');
        expect(resultado.imagem).toBe('imagem.png');
        expect(resultado.categoria).toBe(objectId);
        expect(resultado.ativo).toBe(false);
    });

    it('deve aplicar valor padrão para "ativo" quando não fornecido', () => {
        const dadosValidos = {
            nome: 'Capacitor',
            estoque_minimo: '5',
            categoria: objectId,
        };
        const resultado = ComponenteSchema.parse(dadosValidos);
        expect(resultado.ativo).toBe(true);
    });

    it('deve lançar erro quando "nome" está ausente', () => {
        const dadosInvalidos = {
            estoque_minimo: '10',
            categoria: objectId,
        };
        expect(() => ComponenteSchema.parse(dadosInvalidos)).toThrow();
    });

    it('deve lançar erro quando "nome" está vazio', () => {
        const dadosInvalidos = {
            nome: '   ',
            estoque_minimo: '10',
            categoria: objectId,
        };
        expect(() => ComponenteSchema.parse(dadosInvalidos)).toThrow('Nome não pode ser vazio');
    });

    it('deve lançar erro quando "estoque_minimo" não é número', () => {
        const dadosInvalidos = {
            nome: 'Resistor',
            estoque_minimo: 'dez',
            categoria: objectId,
        };
        expect(() => ComponenteSchema.parse(dadosInvalidos)).toThrow('Estoque mínimo deve ser inteiro');
    });

    it('deve lançar erro quando "categoria" não é ObjectId', () => {
        const dadosInvalidos = {
            nome: 'Resistor',
            estoque_minimo: '10',
            categoria: '123',
        };
        expect(() => ComponenteSchema.parse(dadosInvalidos)).toThrow();
    });

    it('deve lançar erro quando "ativo" não é booleano', () => {
        const dadosInvalidos = {
            nome: 'Resistor',
            estoque_minimo: '10',
            categoria: objectId,
            ativo: 'sim',
        };
        expect(() => ComponenteSchema.parse(dadosInvalidos)).toThrow();
    });

    it('deve tratar corretamente valores undefined para estoque_minimo', () => {
        const dados = {
            nome: 'Resistor',
            estoque_minimo: '',
            categoria: objectId,
        };
        const resultado = ComponenteSchema.parse(dados);
        expect(resultado.estoque_minimo).toBeUndefined();
    });
    

    
    it('deve remover espaços em branco do nome', () => {
        const dados = {
            nome: '  Resistor  ',
            estoque_minimo: '10',
            categoria: objectId,
        };
        const resultado = ComponenteSchema.parse(dados);
        expect(resultado.nome).toBe('Resistor');
    });
});

describe('ComponenteUpdateSchema', () => {
    const objectId = new mongoose.Types.ObjectId().toString();

    it('deve validar dados parciais corretamente', () => {
        const dadosParciais = { nome: 'Novo Nome' };
        const resultado = ComponenteUpdateSchema.parse(dadosParciais);
        expect(resultado.nome).toBe('Novo Nome');
    });

    it('deve aceitar objeto vazio e manter campos indefinidos', () => {
        const resultado = ComponenteUpdateSchema.parse({});
        expect(resultado.nome).toBeUndefined();
        expect(resultado.estoque_minimo).toBeUndefined();
        expect(resultado.categoria).toBeUndefined();
        expect(resultado.ativo).toBeUndefined();
    });

    it('deve lançar erro quando "nome" está vazio', () => {
        const dadosInvalidos = { nome: '   ' };
        expect(() => ComponenteUpdateSchema.parse(dadosInvalidos)).toThrow('Nome não pode ser vazio');
    });

    it('deve lançar erro quando "estoque_minimo" não é número', () => {
        const dadosInvalidos = { estoque_minimo: 'dez' };
        expect(() => ComponenteUpdateSchema.parse(dadosInvalidos)).toThrow('Estoque mínimo deve ser inteiro');
    });





    it('deve lançar erro quando "categoria" não é ObjectId', () => {
        const dadosInvalidos = { categoria: '123' };
        expect(() => ComponenteUpdateSchema.parse(dadosInvalidos)).toThrow();
    });

    it('deve lançar erro quando "ativo" não é booleano', () => {
        const dadosInvalidos = { ativo: 'sim' };
        expect(() => ComponenteUpdateSchema.parse(dadosInvalidos)).toThrow();
    });
});
