import type { Response } from 'express';

class SSEService {
  private clients: Map<string, Response[]>;

  constructor() {
    this.clients = new Map();
  }

  addClient(userId: string | { toString(): string }, res: Response) {
    const userIdStr = userId.toString();
    if (!this.clients.has(userIdStr)) {
      this.clients.set(userIdStr, []);
    }
    this.clients.get(userIdStr)!.push(res);

    res.on('close', () => {
      this.removeClient(userIdStr, res);
    });
  }

  removeClient(userId: string | { toString(): string }, res: Response) {
    const userIdStr = userId.toString();
    const clients = this.clients.get(userIdStr);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        this.clients.delete(userIdStr);
      }
    }
  }

  sendToUser(
    userId: string | { toString(): string },
    eventType: string,
    data: unknown,
  ) {
    const userIdStr = userId.toString();
    const clients = this.clients.get(userIdStr);
    if (clients) {
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      clients.forEach((client) => {
        try {
          client.write(message);
        } catch (error) {
          console.error('[SSE] Erro ao enviar:', error);
        }
      });
    }
  }

  sendNotification(
    userId: string | { toString(): string },
    notificacao: unknown,
  ) {
    this.sendToUser(userId, 'notificacao', notificacao);
  }

  getConnectedClientsCount(): number {
    let count = 0;
    this.clients.forEach((clients) => {
      count += clients.length;
    });
    return count;
  }
}

export default new SSEService();
