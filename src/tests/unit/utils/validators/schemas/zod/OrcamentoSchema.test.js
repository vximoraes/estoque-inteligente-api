import { OrcamentoSchema, ComponenteOrcamentoSchema, OrcamentoUpdateSchema, ComponenteOrcamentoUpdateSchema } from '../../../../../../utils/validators/schemas/zod/OrcamentoSchema.js';

describe('OrcamentoSchema', () => {
    it('valida orçamento válido', () => {
        const data = {
            nome: 'Orçamento Teste',
            descricao: 'Desc',
            componentes: [
                { componente: '64f234a0c781a7b30c2fe445', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '2', valor_unitario: '1.5' },
                { componente: '64f234a0c781a7b30c2fe447', fornecedor: '64f234a0c781a7b30c2fe448', quantidade: '1', valor_unitario: '2' }
            ]
        };
        const result = OrcamentoSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.componentes[0].quantidade).toBe(2);
        expect(result.data.componentes[0].valor_unitario).toBe(1.5);
    });

    it('falha se faltar nome ou componente_orcamento', () => {
        const result = OrcamentoSchema.safeParse({});
        expect(result.success).toBe(false);
        expect(result.error.issues.length).toBeGreaterThan(0);
    });

    it('falha se componentes for vazio', () => {
        const data = { nome: 'Teste', componentes: [] };
        const result = OrcamentoSchema.safeParse(data);
        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/pelo menos um componente/i);
    });

    it('falha se nome for vazio', () => {
        const data = {
            nome: '',
            componentes: [{ componente: '64f234a0c781a7b30c2fe445', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '1', valor_unitario: '1' }]
        };
        const result = OrcamentoSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('falha se quantidade não for inteiro > 0', () => {
        const data = {
            nome: 'Teste',
            componentes: [{ componente: '64f234a0c781a7b30c2fe445', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '0', valor_unitario: '1' }]
        };
        const result = OrcamentoSchema.safeParse(data);
        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/Quantidade: 1 a 999.999.999/i);
    });

    it('falha se valor_unitario não for número', () => {
        const data = {
            nome: 'Teste',
            componentes: [{ componente: '64f234a0c781a7b30c2fe445', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '1', valor_unitario: 'abc' }]
        };
        const result = OrcamentoSchema.safeParse(data);
        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/número válido/i);
    });
});

describe('ComponenteOrcamentoSchema', () => {
    it('valida componente válido', () => {
        const data = { componente: '64f234a0c781a7b30c2fe445', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '2', valor_unitario: '1.5' };
        const result = ComponenteOrcamentoSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.quantidade).toBe(2);
        expect(result.data.valor_unitario).toBe(1.5);
    });

    it('falha se componente inválido', () => {
        const data = { componente: 'invalid-id', fornecedor: '64f234a0c781a7b30c2fe446', quantidade: '1', valor_unitario: '1' };
        const result = ComponenteOrcamentoSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

describe('OrcamentoUpdateSchema', () => {
    it('aceita atualização parcial', () => {
        const data = { nome: 'Novo Nome' };
        const result = OrcamentoUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.nome).toBe('Novo Nome');
    });
});

describe('ComponenteOrcamentoUpdateSchema', () => {
    it('aceita atualização parcial', () => {
        const data = { quantidade: '5' };
        const result = ComponenteOrcamentoUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.quantidade).toBe(5);
    });
});
