import { FornecedorIdSchema, FornecedorQuerySchema } from '../../../../../../../utils/validators/schemas/zod/querys/FornecedorQuerySchema.js';

describe('FornecedorIdSchema', () => {
    it('valida um ObjectId válido', () => {
        // 24 hex chars
        const validId = '507f1f77bcf86cd799439011';
        expect(() => FornecedorIdSchema.parse(validId)).not.toThrow();
    });

    it('retorna erro para ObjectId inválido', () => {
        const invalidId = '123';
        expect(() => FornecedorIdSchema.parse(invalidId)).toThrow('ID inválido');
    });
});

describe('FornecedorQuerySchema', () => {
    it('valida query vazia (usa defaults)', () => {
        const parsed = FornecedorQuerySchema.parse({});
        expect(parsed.page).toBe(1);
        expect(parsed.limite).toBe(10);
        expect(parsed.nome).toBeUndefined();
    });

    it('valida nome com trim', () => {
        const parsed = FornecedorQuerySchema.parse({ nome: '  Teste  ' });
        expect(parsed.nome).toBe('Teste');
    });    
    
    it('retorna erro se nome for string vazia', async () => {
        await expect(FornecedorQuerySchema.parseAsync({ nome: '' })).rejects.toThrow('Nome não pode ser vazio');
    });

    it('valida paginação válida', () => {
        const parsed = FornecedorQuerySchema.parse({ page: '2', limite: '5' });
        expect(parsed.page).toBe(2);
        expect(parsed.limite).toBe(5);
    });

    it('retorna erro para paginação inválida', () => {
        expect(() => FornecedorQuerySchema.parse({ page: '0' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => FornecedorQuerySchema.parse({ page: '-1' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => FornecedorQuerySchema.parse({ limite: '0' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
        expect(() => FornecedorQuerySchema.parse({ limite: '101' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
        expect(() => FornecedorQuerySchema.parse({ page: 'abc' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => FornecedorQuerySchema.parse({ limite: 'abc' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
    });

    it('valida valores undefined e string vazia com defaults', () => {
        const parsed1 = FornecedorQuerySchema.parse({ page: undefined, limite: undefined });
        expect(parsed1.page).toBe(1);
        expect(parsed1.limite).toBe(10);

        const parsed2 = FornecedorQuerySchema.parse({ page: '', limite: '' });
        expect(parsed2.page).toBe(1);
        expect(parsed2.limite).toBe(10);
    });
});