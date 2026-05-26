class SSEService {
  constructor() {
    this.clients = new Map();
  }

  addClient(userId, res) {
    const userIdStr = userId.toString();
    if (!this.clients.has(userIdStr)) {
      this.clients.set(userIdStr, []);
    }
    this.clients.get(userIdStr).push(res);

    res.on('close', () => {
      this.removeClient(userIdStr, res);
    });
  }

  removeClient(userId, res) {
    const userIdStr = userId.toString();
    if (this.clients.has(userIdStr)) {
      const clients = this.clients.get(userIdStr);
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        this.clients.delete(userIdStr);
      }
    }
  }

  sendToUser(userId, eventType, data) {
    const userIdStr = userId.toString();

    if (this.clients.has(userIdStr)) {
      const clients = this.clients.get(userIdStr);
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

  sendNotification(userId, notificacao) {
    this.sendToUser(userId, 'notificacao', notificacao);
  }

  getConnectedClientsCount() {
    let count = 0;
    this.clients.forEach((clients) => {
      count += clients.length;
    });
    return count;
  }
}

export default new SSEService();
