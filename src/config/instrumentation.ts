import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { suprimirPrecosNativosDoLangfuse } from '../modules/ia/IAObservabilidade.js';
import logger from '../utils/logger.js';

const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
const secretKey = process.env['LANGFUSE_SECRET_KEY'];

let sdk: NodeSDK | null = null;

if (publicKey && secretKey) {
  sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey,
        secretKey,
        baseUrl: process.env['LANGFUSE_BASE_URL'] ?? 'http://localhost:3002',
        environment: process.env['NODE_ENV'] ?? 'development',
      }),
    ],
  });
  sdk.start();
  logger.info('Langfuse: tracing de IA ativo.');
  void suprimirPrecosNativosDoLangfuse();
} else {
  logger.warn(
    'LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY não configuradas. Tracing de IA desativado.',
  );
}

export async function encerrarObservabilidade(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown().catch(() => {});
}
