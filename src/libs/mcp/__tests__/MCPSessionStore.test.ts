import MCPSessionStore, { type MCPSession } from '../MCPSessionStore.js';

function criarSessaoFake(usuarioId = 'usuario-1'): MCPSession {
  return {
    transport: { close: jest.fn().mockResolvedValue(undefined) } as any,

    server: {} as any,
    usuarioId,
  };
}

describe('MCPSessionStore', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve armazenar e recuperar uma sessão', () => {
    const sessao = criarSessaoFake();
    MCPSessionStore.set('sessao-1', sessao);

    expect(MCPSessionStore.has('sessao-1')).toBe(true);
    expect(MCPSessionStore.get('sessao-1')).toBe(sessao);

    MCPSessionStore.delete('sessao-1');
  });

  it('deve retornar null para sessão inexistente', () => {
    expect(MCPSessionStore.get('nao-existe')).toBeNull();
  });

  it('delete deve remover a sessão do store', () => {
    MCPSessionStore.set('sessao-2', criarSessaoFake());
    MCPSessionStore.delete('sessao-2');
    expect(MCPSessionStore.has('sessao-2')).toBe(false);
  });

  it('deve expirar e fechar o transport após o TTL de ociosidade (2 min)', () => {
    jest.useFakeTimers();
    const sessao = criarSessaoFake();
    MCPSessionStore.set('sessao-ttl', sessao);

    jest.advanceTimersByTime(2 * 60 * 1000 + 1);

    expect(MCPSessionStore.has('sessao-ttl')).toBe(false);
    expect(sessao.transport.close).toHaveBeenCalled();
  });

  it('get() deve renovar o TTL de ociosidade em sessão ativa', () => {
    jest.useFakeTimers();
    const sessao = criarSessaoFake();
    MCPSessionStore.set('sessao-ativa', sessao);

    jest.advanceTimersByTime(90 * 1000);
    MCPSessionStore.get('sessao-ativa');
    jest.advanceTimersByTime(90 * 1000);

    expect(MCPSessionStore.has('sessao-ativa')).toBe(true);

    jest.advanceTimersByTime(2 * 60 * 1000 + 1);
    expect(MCPSessionStore.has('sessao-ativa')).toBe(false);
  });

  it('get() deve expirar por TTL absoluto (30 min) mesmo com atividade contínua', () => {
    jest.useFakeTimers();
    const sessao = criarSessaoFake();
    MCPSessionStore.set('sessao-absoluta', sessao);

    // Renova o TTL de ociosidade repetidamente, sem nunca deixar passar os 2 min,
    // mas ultrapassando o teto absoluto de 30 min.
    for (let i = 0; i < 21; i++) {
      jest.advanceTimersByTime(90 * 1000);
      MCPSessionStore.get('sessao-absoluta');
    }

    expect(MCPSessionStore.has('sessao-absoluta')).toBe(false);
    expect(sessao.transport.close).toHaveBeenCalled();
  });

  it('deve evictar a sessão mais antiga ao exceder MAX_SESSOES', () => {
    for (let i = 0; i < 101; i++) {
      MCPSessionStore.set(`sessao-lote-${i}`, criarSessaoFake());
    }

    expect(MCPSessionStore.has('sessao-lote-0')).toBe(false);
    expect(MCPSessionStore.has('sessao-lote-100')).toBe(true);

    for (let i = 1; i <= 100; i++) {
      MCPSessionStore.delete(`sessao-lote-${i}`);
    }
  });
});
