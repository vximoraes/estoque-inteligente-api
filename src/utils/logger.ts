import pino from 'pino';
import path from 'path';

const level = process.env.LOG_LEVEL ?? 'info';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';
const usePretty = process.env.LOG_PRETTY !== 'false' && !isProduction;

const targets: pino.TransportTargetOptions[] = [];

if (!isTest) {
  targets.push({
    target: usePretty ? 'pino-pretty' : 'pino/file',
    options: usePretty ? { colorize: true } : { destination: 1 },
    level,
  });
}

if (!isTest && !isProduction) {
  targets.push(
    {
      target: 'pino-roll',
      options: {
        file: path.join('logs', 'combined.log'),
        frequency: 'daily',
        mkdir: true,
        limit: { count: 30 },
      },
      level,
    },
    {
      target: 'pino-roll',
      options: {
        file: path.join('logs', 'error.log'),
        frequency: 'daily',
        mkdir: true,
        limit: { count: 30 },
      },
      level: 'error',
    },
  );
}

const logger = pino(
  { level },
  targets.length > 0 ? pino.transport({ targets }) : pino.destination(1),
);

export default logger;
