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
        console.log('[SSE] Cliente conectado. UserId:', userIdStr, 'Total clientes:', this.getConnectedClientsCount());

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
            console.log('[SSE] Cliente desconectado. UserId:', userIdStr, 'Total clientes:', this.getConnectedClientsCount());
        }
    }

    sendToUser(userId, eventType, data) {
        const userIdStr = userId.toString();
        console.log('[SSE] Tentando enviar para userId:', userIdStr, 'Clientes conectados:', Array.from(this.clients.keys()));
        
        if (this.clients.has(userIdStr)) {
            const clients = this.clients.get(userIdStr);
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            
            console.log('[SSE] Enviando mensagem para', clients.length, 'cliente(s)');
            
            clients.forEach(client => {
                try {
                    client.write(message);
                } catch (error) {
                    console.error('[SSE] Erro ao enviar:', error);
                }
            });
        } else {
            console.log('[SSE] Nenhum cliente conectado para este usuário');
        }
    }

    sendNotification(userId, notificacao) {
        this.sendToUser(userId, 'notificacao', notificacao);
    }

    getConnectedClientsCount() {
        let count = 0;
        this.clients.forEach(clients => {
            count += clients.length;
        });
        return count;
    }
}

export default new SSEService();
