import { UsuarioIdSchema, UsuarioQuerySchema } from '../../../../../../../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
import mongoose from 'mongoose';

describe('UsuarioIdSchema', () => {
    it('deve validar um ObjectId correto', () => {
        const idValido = new mongoose.Types.ObjectId().toString();
        expect(() => UsuarioIdSchema.parse(idValido)).not.toThrow();
    });

    it('deve invalidar um ObjectId incorreto', () => {
        const idInvalido = '12345';
        expect(() => UsuarioIdSchema.parse(idInvalido)).toThrow('ID inválido');
    });
});

describe('UsuarioQuerySchema', () => {
    const consultaValida = {
        nome: 'John Doe',
        email: 'john.doe@example.com',
        ativo: 'true',
        page: '2',
        limite: '20',
    };

    it('deve validar um objeto de consulta correto', () => {
        expect(() => UsuarioQuerySchema.parse(consultaValida)).not.toThrow();
    });

    it('deve permitir campos opcionais ausentes', () => {
        expect(() => UsuarioQuerySchema.parse({})).not.toThrow();
    });

    it('deve remover espaços do nome e aceitar', () => {
        const consulta = { ...consultaValida, nome: '   John Doe   ' };
        const resultado = UsuarioQuerySchema.parse(consulta);
        expect(resultado.nome).toBe('John Doe');
    });

    it('deve invalidar email em formato incorreto', () => {
        const consulta = { ...consultaValida, email: 'email-invalido' };
        expect(() => UsuarioQuerySchema.parse(consulta)).toThrow('Formato de email inválido');
    });

    it('deve permitir email indefinido', () => {
        const consulta = { ...consultaValida };
        delete consulta.email;
        expect(() => UsuarioQuerySchema.parse(consulta)).not.toThrow();
    });

    it('deve invalidar valor incorreto para ativo', () => {
        const consulta = { ...consultaValida, ativo: 'yes' };
        expect(() => UsuarioQuerySchema.parse(consulta)).toThrow("Ativo deve ser 'true' ou 'false'");
    });

    it('deve permitir ativo indefinido', () => {
        const consulta = { ...consultaValida };
        delete consulta.ativo;
        expect(() => UsuarioQuerySchema.parse(consulta)).not.toThrow();
    });

    it('deve validar paginação válida e usar defaults', () => {
        const resultado1 = UsuarioQuerySchema.parse({ page: '2', limite: '5' });
        expect(resultado1.page).toBe(2);
        expect(resultado1.limite).toBe(5);

        const resultado2 = UsuarioQuerySchema.parse({});
        expect(resultado2.page).toBe(1);
        expect(resultado2.limite).toBe(10);
    });

    it('deve invalidar paginação inválida', () => {
        expect(() => UsuarioQuerySchema.parse({ page: 'abc' })).toThrow();
        expect(() => UsuarioQuerySchema.parse({ page: '0' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => UsuarioQuerySchema.parse({ limite: '101' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
        expect(() => UsuarioQuerySchema.parse({ limite: '0' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
    });
});
