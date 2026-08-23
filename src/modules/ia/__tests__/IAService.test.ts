import {
  contemVazamentoDoPrompt,
  montarPromptComResumo,
  calcularFatiaParaResumir,
} from '../IAService.js';

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

describe('montarPromptComResumo', () => {
  it('retorna o prompt base quando não há resumo', () => {
    expect(montarPromptComResumo()).toContain('<assistente_estoque_config>');
    expect(montarPromptComResumo('')).not.toContain('resumo_conversa_anterior');
  });

  it('inclui o resumo antes do prompt base quando presente', () => {
    const resultado = montarPromptComResumo(
      'Usuário perguntou sobre notebooks.',
    );
    expect(resultado).toContain('<resumo_conversa_anterior>');
    expect(resultado).toContain('Usuário perguntou sobre notebooks.');
    expect(resultado).toContain('<assistente_estoque_config>');
    expect(resultado.indexOf('resumo_conversa_anterior')).toBeLessThan(
      resultado.indexOf('assistente_estoque_config'),
    );
  });
});

describe('calcularFatiaParaResumir', () => {
  it('retorna null quando a conversa ainda cabe inteira na janela', () => {
    expect(calcularFatiaParaResumir(10, 0)).toBeNull();
  });

  it('retorna a fatia mais antiga assim que a conversa ultrapassa a janela', () => {
    expect(calcularFatiaParaResumir(16, 0)).toEqual({ inicio: 0, fim: 1 });
  });

  it('acompanha o crescimento da conversa incrementalmente', () => {
    expect(calcularFatiaParaResumir(20, 1)).toEqual({ inicio: 1, fim: 5 });
  });

  it('retorna null quando o resumo já está em dia com a janela atual', () => {
    expect(calcularFatiaParaResumir(20, 5)).toBeNull();
  });
});
