import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const SESSION_TTL_MS = 10 * 60 * 1000;

export interface MCPSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  usuarioId: string;
}

class MCPSessionStore {
  private _store: Map<string, MCPSession>;
  private _timers: Map<string, ReturnType<typeof setTimeout>>;

  constructor() {
    this._store = new Map();
    this._timers = new Map();
  }

  set(sessionId: string, sessionData: MCPSession): void {
    this._store.set(sessionId, sessionData);
    this._resetTimer(sessionId);
  }

  get(sessionId: string): MCPSession | null {
    if (!this._store.has(sessionId)) return null;
    this._resetTimer(sessionId);
    return this._store.get(sessionId) ?? null;
  }

  delete(sessionId: string): void {
    this._store.delete(sessionId);
    const timer = this._timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(sessionId);
    }
  }

  has(sessionId: string): boolean {
    return this._store.has(sessionId);
  }

  private _resetTimer(sessionId: string): void {
    const existing = this._timers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      const session = this._store.get(sessionId);
      if (session?.transport) {
        session.transport.close().catch(() => {});
      }
      this._store.delete(sessionId);
      this._timers.delete(sessionId);
    }, SESSION_TTL_MS);

    this._timers.set(sessionId, timer);
  }
}

export default new MCPSessionStore();
