import {
  OrcamentoSchema,
  ItemOrcamentoSchema,
  OrcamentoUpdateSchema,
  ItemOrcamentoUpdateSchema,
} from '../../../../../../utils/validators/schemas/zod/OrcamentoSchema.js';

describe('OrcamentoSchema', () => {
  it('valida orçamento válido', () => {
    const data = {
      nome: 'Orçamento Teste',
      descricao: 'Desc',
      itens: [
        {
          item: '64f234a0c781a7b30c2fe445',
          fornecedor: '64f234a0c781a7b30c2fe446',
          quantidade: '2',
          valor_unitario: '1.5',
        },
        {
          item: '64f234a0c781a7b30c2fe447',
          fornecedor: '64f234a0c781a7b30c2fe448',
          quantidade: '1',
          valor_unitario: '2',
        },
      ],
    };
    const result = OrcamentoSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.itens[0].quantidade).toBe(2);
    expect(result.data.itens[0].valor_unitario).toBe(1.5);
  });

  it('falha se faltar nome ou item_orcamento', () => {
    const result = OrcamentoSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error.issues.length).toBeGreaterThan(0);
  });

  it('falha se itens for vazio', () => {
    const data = { nome: 'Teste', itens: [] };
    const result = OrcamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/pelo menos um item/i);
  });

  it('falha se nome for vazio', () => {
    const data = {
      nome: '',
      itens: [
        {
          item: '64f234a0c781a7b30c2fe445',
          fornecedor: '64f234a0c781a7b30c2fe446',
          quantidade: '1',
          valor_unitario: '1',
        },
      ],
    };
    const result = OrcamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('falha se quantidade não for inteiro > 0', () => {
    const data = {
      nome: 'Teste',
      itens: [
        {
          item: '64f234a0c781a7b30c2fe445',
          fornecedor: '64f234a0c781a7b30c2fe446',
          quantidade: '0',
          valor_unitario: '1',
        },
      ],
    };
    const result = OrcamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(
      /Quantidade: 1 a 999.999.999/i,
    );
  });

  it('falha se valor_unitario não for número', () => {
    const data = {
      nome: 'Teste',
      itens: [
        {
          item: '64f234a0c781a7b30c2fe445',
          fornecedor: '64f234a0c781a7b30c2fe446',
          quantidade: '1',
          valor_unitario: 'abc',
        },
      ],
    };
    const result = OrcamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toMatch(/número válido/i);
  });
});

describe('ItemOrcamentoSchema', () => {
  it('valida item válido', () => {
    const data = {
      item: '64f234a0c781a7b30c2fe445',
      fornecedor: '64f234a0c781a7b30c2fe446',
      quantidade: '2',
      valor_unitario: '1.5',
    };
    const result = ItemOrcamentoSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.quantidade).toBe(2);
    expect(result.data.valor_unitario).toBe(1.5);
  });

  it('falha se item inválido', () => {
    const data = {
      item: 'invalid-id',
      fornecedor: '64f234a0c781a7b30c2fe446',
      quantidade: '1',
      valor_unitario: '1',
    };
    const result = ItemOrcamentoSchema.safeParse(data);
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

describe('ItemOrcamentoUpdateSchema', () => {
  it('aceita atualização parcial', () => {
    const data = { quantidade: '5' };
    const result = ItemOrcamentoUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.quantidade).toBe(5);
  });
});
