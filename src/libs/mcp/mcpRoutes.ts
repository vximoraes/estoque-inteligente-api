import express from 'express';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { criarMCPServer } from './MCPServerFactory.js';
import MCPSessionStore from './MCPSessionStore.js';

type VerifyAsync = (token: string, secret: string) => Promise<jwt.JwtPayload>;
const verifyAsync = promisify(jwt.verify) as unknown as VerifyAsync;

interface MCPError extends Error {
  statusCode?: number;
}

function mcpError(message: string, statusCode: number): MCPError {
  const err = new Error(message) as MCPError;
  err.statusCode = statusCode;
  return err;
}

const router = express.Router();

async function autenticarRequisicao(req: Request): Promise<string> {
  const authHeader = req.headers?.authorization;
  if (!authHeader) throw mcpError('Token não informado', 401);

  const parts = authHeader.split(' ');
  const token = (parts.length === 2 ? parts[1] : parts[0]) as string;

  try {
    const decoded = await verifyAsync(token, process.env['JWT_SECRET_ACCESS_TOKEN'] ?? '');
    if (!decoded?.['id']) throw new Error('Token inválido');
    return decoded['id'] as string;
  } catch {
    throw mcpError('Token JWT inválido ou expirado', 401);
  }
}

function resolverSessao(sessionId: string, usuarioId: string) {
  const session = MCPSessionStore.get(sessionId);
  if (!session) throw mcpError('Sessão MCP não encontrada ou expirada', 404);
  if (session.usuarioId !== usuarioId) throw mcpError('Sessão não pertence a este usuário', 403);
  return session;
}

router.post('/mcp', express.json(), async (req: Request, res: Response) => {
  try {
    const usuarioId = await autenticarRequisicao(req);
    const existingSessionId = req.headers['mcp-session-id'] as string | undefined;

    if (existingSessionId) {
      const session = resolverSessao(existingSessionId, usuarioId);
      return await session.transport.handleRequest(req, res, req.body);
    }

    const server = criarMCPServer(usuarioId);
    const port = process.env['PORT'] ?? 5000;
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        MCPSessionStore.set(sessionId, { transport, server, usuarioId });
      },
      enableDnsRebindingProtection: true,
      allowedHosts: [`localhost:${port}`, `127.0.0.1:${port}`],
      allowedOrigins: [frontendUrl],
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) MCPSessionStore.delete(sessionId);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    const error = err as MCPError;
    if (!res.headersSent) {
      res.status(error.statusCode ?? 500).json({ error: error.message });
    }
  }
});

router.get('/mcp', async (req: Request, res: Response) => {
  try {
    const usuarioId = await autenticarRequisicao(req);
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      return res.status(400).json({ error: 'Mcp-Session-Id obrigatório' });
    }

    const session = resolverSessao(sessionId, usuarioId);
    await session.transport.handleRequest(req, res);
  } catch (err) {
    const error = err as MCPError;
    if (!res.headersSent) {
      res.status(error.statusCode ?? 500).json({ error: error.message });
    }
  }
});

router.delete('/mcp', async (req: Request, res: Response) => {
  try {
    const usuarioId = await autenticarRequisicao(req);
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) {
      return res.status(400).json({ error: 'Mcp-Session-Id obrigatório' });
    }

    const session = resolverSessao(sessionId, usuarioId);
    await session.transport.handleRequest(req, res);
    MCPSessionStore.delete(sessionId);
  } catch (err) {
    const error = err as MCPError;
    if (!res.headersSent) {
      res.status(error.statusCode ?? 500).json({ error: error.message });
    }
  }
});

export default router;
