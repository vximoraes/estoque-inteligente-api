import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';

async function waitReady(url: string): Promise<void> {
  for (;;) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

async function main() {
  const port = process.env['ROUTES_TEST_PORT'] || '3011';
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const dbUrl = replSet.getUri('estoque-inteligente-test');

  const env = {
    ...process.env,
    DB_URL: dbUrl,
    PORT: port,
    NODE_ENV: 'test',
    EMAIL_USER: '',
    EMAIL_APP_PASSWORD: '',
  };

  await new Promise<void>((resolve, reject) => {
    const seed = spawn('npx', ['tsx', 'src/seeds/seeds.ts'], {
      env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    seed.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`seed saiu com código ${code}`)),
    );
  });

  const server = spawn('npx', ['tsx', 'server.ts'], {
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const shutdown = async () => {
    server.kill();
    await replSet.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await waitReady(`http://localhost:${port}/`);
  process.stdout.write('ROUTES_TEST_SERVER_READY\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
