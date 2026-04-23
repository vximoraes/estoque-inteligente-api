const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos

class MCPSessionStore {
  constructor() {
    this._store = new Map();
    this._timers = new Map();
  }

  set(sessionId, sessionData) {
    this._store.set(sessionId, sessionData);
    this._resetTimer(sessionId);
  }

  get(sessionId) {
    if (!this._store.has(sessionId)) return null;
    this._resetTimer(sessionId);
    return this._store.get(sessionId);
  }

  delete(sessionId) {
    this._store.delete(sessionId);
    const timer = this._timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(sessionId);
    }
  }

  has(sessionId) {
    return this._store.has(sessionId);
  }

  _resetTimer(sessionId) {
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
