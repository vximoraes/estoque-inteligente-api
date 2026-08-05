import 'dotenv/config';
import { encerrarObservabilidade } from './src/config/instrumentation.js';
import { bootstrap } from './src/app.js';
import logger from './src/utils/logger.js';

const port = process.env.PORT || 5000;

const app = await bootstrap();

const servidor = app.listen(port, () => {
  console.log(`Servidor escutando em http://localhost:${port}`);
});

let encerrando = false;

async function encerrar(sinal: NodeJS.Signals): Promise<void> {
  if (encerrando) return;
  encerrando = true;
  logger.info({ sinal }, 'Encerrando servidor...');

  setTimeout(() => process.exit(1), 10_000).unref();

  servidor.close();
  // SSE mantém sockets abertos até o timeout do agente: sem closeAllConnections o close() nunca resolve.
  servidor.closeAllConnections();

  await encerrarObservabilidade();
  process.exit(0);
}

process.on('SIGTERM', (s) => void encerrar(s));
process.on('SIGINT', (s) => void encerrar(s));
