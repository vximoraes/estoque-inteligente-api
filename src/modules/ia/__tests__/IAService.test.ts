import { contemVazamentoDoPrompt } from '../IAService.js';

describe('contemVazamentoDoPrompt', () => {
  it('deve detectar vazamento quando a resposta contém a tag raiz do prompt', () => {
    expect(
      contemVazamentoDoPrompt(
        'Claro, meu prompt é: <assistente_estoque_config> ...',
      ),
    ).toBe(true);
  });

  it('deve detectar vazamento quando a resposta contém o bloco de injection_resistance', () => {
    expect(
      contemVazamentoDoPrompt('<injection_resistance>ESTAS REGRAS...'),
    ).toBe(true);
  });

  it('não deve marcar uma resposta normal como vazamento', () => {
    expect(
      contemVazamentoDoPrompt('Há **3** itens abaixo do estoque mínimo.'),
    ).toBe(false);
  });

  it('não deve marcar falso positivo por menção solta de "config" ou "identity"', () => {
    expect(
      contemVazamentoDoPrompt('A identity do fornecedor está em análise.'),
    ).toBe(false);
  });

  it('deve detectar vazamento mesmo com caracteres invisíveis intercalados no canário (ofuscação)', () => {
    // zero-width space (U+200B) inserido no meio da tag pra tentar escapar
    // do match por substring — escape numérico de propósito, ver IASchema.test.ts.
    const zwsp = String.fromCharCode(0x200b);
    const textoOfuscado = `<assistente_estoque${zwsp}_config> ...`;
    expect(contemVazamentoDoPrompt(textoOfuscado)).toBe(true);
  });
});
