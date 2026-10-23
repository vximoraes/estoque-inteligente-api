import { etapaDaFerramenta } from '../etapaDaFerramenta.js';

describe('etapaDaFerramenta', () => {
  it('descreve a ferramenta, com ou sem o prefixo do servidor MCP', () => {
    expect(etapaDaFerramenta('buscarEmprestimos')).toBe(
      'Consultando empréstimos…',
    );
    expect(etapaDaFerramenta('estoque__resumoEstoque')).toBe(
      'Montando o resumo do estoque…',
    );
  });

  it('usa um texto genérico para ferramenta desconhecida', () => {
    expect(etapaDaFerramenta('outra')).toBe('Consultando os dados…');
    expect(etapaDaFerramenta(undefined)).toBe('Consultando os dados…');
  });
});
