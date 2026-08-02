import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PID_FILE = path.resolve(process.cwd(), '.routes-test-runner.pid');
const PORT = process.env['ROUTES_TEST_PORT'] || '3011';

export default async function globalSetup(): Promise<void> {
  const runner = spawn('npx', ['tsx', 'test/routesServer.runner.ts'], {
    env: { ...process.env, ROUTES_TEST_PORT: PORT },
    stdio: ['ignore', 'pipe', 'inherit'],
    detached: true,
  });
  runner.unref();
  fs.writeFileSync(PID_FILE, String(runner.pid));

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error('Timeout esperando o servidor de teste de rotas subir.'),
        ),
      60000,
    );
    runner.stdout!.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('ROUTES_TEST_SERVER_READY')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    runner.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        reject(
          new Error(
            `Processo do servidor de teste de rotas saiu com código ${code}`,
          ),
        );
      }
    });
  });

  process.env['PORT'] = PORT;
}
