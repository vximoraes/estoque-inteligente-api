import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const SESSION_TTL_MS = 2 * 60 * 1000;
const SESSION_TTL_ABSOLUTO_MS = 30 * 60 * 1000;
const MAX_SESSOES = Number(process.env['MCP_MAX_SESSOES'] ?? 100);

export interface MCPSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  usuarioId: string;
}

class MCPSessionStore {
  private _store: Map<string, MCPSession>;
  private _timers: Map<string, ReturnType<typeof setTimeout>>;
  private _criadaEm: Map<string, number>;

  constructor() {
    this._store = new Map();
    this._timers = new Map();
    this._criadaEm = new Map();
  }

  set(sessionId: string, sessionData: MCPSession): void {
    if (!this._store.has(sessionId) && this._store.size >= MAX_SESSOES) {
      const maisAntigaId = this._store.keys().next().value;
      if (maisAntigaId) this._encerrar(maisAntigaId);
    }

    this._store.set(sessionId, sessionData);
    this._criadaEm.set(sessionId, Date.now());
    this._resetTimer(sessionId);
  }

  get(sessionId: string): MCPSession | null {
    const session = this._store.get(sessionId);
    if (!session) return null;

    const criadaEm = this._criadaEm.get(sessionId) ?? 0;
    if (Date.now() - criadaEm > SESSION_TTL_ABSOLUTO_MS) {
      this._encerrar(sessionId);
      return null;
    }

    this._resetTimer(sessionId);
    return session;
  }

  delete(sessionId: string): void {
    this._store.delete(sessionId);
    this._criadaEm.delete(sessionId);
    const timer = this._timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(sessionId);
    }
  }

  has(sessionId: string): boolean {
    return this._store.has(sessionId);
  }

  private _encerrar(sessionId: string): void {
    const session = this._store.get(sessionId);
    if (session?.transport) {
      session.transport.close().catch(() => {});
    }
    this.delete(sessionId);
  }

  private _resetTimer(sessionId: string): void {
    const existing = this._timers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this._encerrar(sessionId);
    }, SESSION_TTL_MS);

    this._timers.set(sessionId, timer);
  }
}

export default new MCPSessionStore();
