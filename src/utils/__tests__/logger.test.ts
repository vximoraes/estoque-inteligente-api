import logger from '../logger.js';

describe('Logger', () => {
  it('deve exportar pino logger com métodos de log', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('deve usar LOG_LEVEL do ambiente', () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL ?? 'info');
  });
});
