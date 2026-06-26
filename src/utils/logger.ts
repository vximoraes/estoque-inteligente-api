import { createLogger, format, transports, type Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  // eslint-disable-next-line no-var
  var loggerListenersSet: boolean | undefined;
}

class Logger {
  private logDirectory: string;
  private logMaxSizeGB: number;
  maxLogSize: number;
  private logEnabled: boolean;
  logger: WinstonLogger;
  logIntervalId: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.logDirectory = path.resolve(process.cwd(), 'logs');

    this.logMaxSizeGB =
      process.env['LOG_MAX_SIZE_GB'] !== undefined
        ? parseFloat(process.env['LOG_MAX_SIZE_GB'])
        : 50;

    if (isNaN(this.logMaxSizeGB) || this.logMaxSizeGB <= 0) {
      throw new Error('LOG_MAX_SIZE_GB deve ser um número positivo');
    }

    this.maxLogSize = this.logMaxSizeGB * 1024 * 1024 * 1024;
    this.logEnabled =
      process.env['LOG_ENABLED'] !== undefined ? process.env['LOG_ENABLED'] === 'true' : true;

    this.logger = this.createLoggerInstance();
    this.setupExceptionHandlers();
    this.startLogSizeInterval();
  }

  createLoggerInstance(): WinstonLogger {
    const loggerTransports: (
      | transports.ConsoleTransportInstance
      | DailyRotateFile
    )[] = [];

    if (this.logEnabled) {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }

      loggerTransports.push(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: '30d',
        }),
        new DailyRotateFile({
          filename: path.join(this.logDirectory, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
        }),
      );
    }

    return createLogger({
      level: process.env['LOG_LEVEL'] ?? 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
      ),
      defaultMeta: { service: 'usuario-service' },
      transports: loggerTransports,
    });
  }

  getTotalLogSize(directory: string): number {
    if (!fs.existsSync(directory)) return 0;
    return fs.readdirSync(directory).reduce((totalSize, file) => {
      const filePath = path.join(directory, file);
      return totalSize + fs.statSync(filePath).size;
    }, 0);
  }

  ensureLogSizeLimit(directory: string, maxSizeInBytes: number): void {
    let totalSize = this.getTotalLogSize(directory);

    if (totalSize > maxSizeInBytes) {
      const files = fs
        .readdirSync(directory)
        .map((file) => ({
          file,
          time: fs.statSync(path.join(directory, file)).mtime.getTime(),
        }))
        .sort((a, b) => a.time - b.time);

      for (const { file } of files) {
        if (totalSize <= maxSizeInBytes) break;
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        totalSize -= stats.size;
      }
    }
  }

  setupExceptionHandlers(): void {
    if (this.logEnabled && !global.loggerListenersSet && process.env['NODE_ENV'] !== 'test') {
      process.on('uncaughtException', (err) => {
        this.logger.error('Uncaught Exception:', err);
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });

      global.loggerListenersSet = true;
    }
  }

  startLogSizeInterval(): void {
    if (this.logEnabled && process.env['NODE_ENV'] !== 'test') {
      this.logIntervalId = setInterval(
        () => this.ensureLogSizeLimit(this.logDirectory, this.maxLogSize),
        60 * 1000,
      );
    }
  }
}

const loggerInstance = new Logger();

export default loggerInstance.logger;
export const getTotalLogSize = loggerInstance.getTotalLogSize.bind(loggerInstance);
export const ensureLogSizeLimit = loggerInstance.ensureLogSizeLimit.bind(loggerInstance);
export const logIntervalId = loggerInstance.logIntervalId;
export const maxLogSize = loggerInstance.maxLogSize;
