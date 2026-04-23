import express from 'express';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { criarMCPServer } from '../mcp/MCPServerFactory.js';
import MCPSessionStore from '../mcp/MCPSessionStore.js';

const router = express.Router();

async function autenticarRequisicao(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    const err = new Error('Token não informado');
    err.statusCode = 401;
    throw err;
  }

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET_ACCESS_TOKEN);
    if (!decoded?.id) throw new Error('Token inválido');
    return decoded.id;
  } catch {
    const err = new Error('Token JWT inválido ou expirado');
    err.statusCode = 401;
    throw err;
  }
}

router.post('/mcp', express.json(), async (req, res) => {
  try {
    const existingSessionId = req.headers['mcp-session-id'];

    if (existingSessionId) {
      const session = MCPSessionStore.get(existingSessionId);
      if (!session) {
        return res.status(404).json({ error: 'Sessão MCP não encontrada ou expirada' });
      }
      return await session.transport.handleRequest(req, res, req.body);
    }

    const usuarioId = await autenticarRequisicao(req);

    const server = criarMCPServer(usuarioId);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        MCPSessionStore.set(sessionId, { transport, server, usuarioId });
      },
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) MCPSessionStore.delete(sessionId);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    }
  }
});

router.get('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId) {
      return res.status(400).json({ error: 'Mcp-Session-Id obrigatório' });
    }

    const session = MCPSessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão MCP não encontrada ou expirada' });
    }

    await session.transport.handleRequest(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.delete('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId) {
      return res.status(400).json({ error: 'Mcp-Session-Id obrigatório' });
    }

    const session = MCPSessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    await session.transport.handleRequest(req, res);
    MCPSessionStore.delete(sessionId);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
