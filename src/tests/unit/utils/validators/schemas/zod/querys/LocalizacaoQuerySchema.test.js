import { LocalizacaoIdSchema, LocalizacaoQuerySchema } from '../../../../../../../utils/validators/schemas/zod/querys/LocalizacaoQuerySchema.js';

describe('LocalizacaoIdSchema', () => {
    it('valida um ObjectId válido', () => {
        const validId = '507f1f77bcf86cd799439011';
        expect(() => LocalizacaoIdSchema.parse(validId)).not.toThrow();
    });

    it('retorna erro para ObjectId inválido', () => {
        const invalidId = '123';
        expect(() => LocalizacaoIdSchema.parse(invalidId)).toThrow('ID inválido');
    });
});

describe('LocalizacaoQuerySchema', () => {
    it('valida query vazia (usa defaults)', () => {
        const parsed = LocalizacaoQuerySchema.parse({});
        expect(parsed.page).toBe(1);
        expect(parsed.limite).toBe(10);
        expect(parsed.nome).toBeUndefined();
    });

    it('valida nome com trim', () => {
        const parsed = LocalizacaoQuerySchema.parse({ nome: '  Teste  ' });
        expect(parsed.nome).toBe('Teste');
    });
    
    it('retorna erro se nome for string vazia', async () => {
        await expect(LocalizacaoQuerySchema.parseAsync({ nome: '' })).rejects.toThrow('Nome não pode ser vazio');
    });

    it('valida paginação válida', () => {
        const parsed = LocalizacaoQuerySchema.parse({ page: '2', limite: '5' });
        expect(parsed.page).toBe(2);
        expect(parsed.limite).toBe(5);
    });

    it('retorna erro para paginação inválida', () => {
        expect(() => LocalizacaoQuerySchema.parse({ page: '0' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => LocalizacaoQuerySchema.parse({ page: '-1' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => LocalizacaoQuerySchema.parse({ limite: '0' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
        expect(() => LocalizacaoQuerySchema.parse({ limite: '101' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
        expect(() => LocalizacaoQuerySchema.parse({ page: 'abc' })).toThrow('Page deve ser um número inteiro maior que 0');
        expect(() => LocalizacaoQuerySchema.parse({ limite: 'abc' })).toThrow('Limite deve ser um número inteiro entre 1 e 100');
    });

    it('valida valores undefined e string vazia com defaults', () => {
        const parsed1 = LocalizacaoQuerySchema.parse({ nome: undefined });
        expect(parsed1.nome).toBeUndefined();

        const parsed2 = LocalizacaoQuerySchema.parse({ page: undefined, limite: undefined });
        expect(parsed2.page).toBe(1);
        expect(parsed2.limite).toBe(10);

        const parsed3 = LocalizacaoQuerySchema.parse({ page: '', limite: '' });
        expect(parsed3.page).toBe(1);
        expect(parsed3.limite).toBe(10);
    });
});