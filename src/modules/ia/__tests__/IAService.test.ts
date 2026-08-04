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
});
