process.env.NODE_ENV = 'test';

// Mock do client S3 (MinIO) para evitar problemas nos testes
jest.mock('./src/config/minioClient.js', () => ({
  __esModule: true,
  default: {
    send: jest.fn().mockResolvedValue({}),
  },
}));

// Mock do SharpConfig para evitar problemas nos testes
jest.mock('./src/config/sharpConfig.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((buffer) => Promise.resolve(buffer)),
}));

// Mock do Better Auth para evitar problemas nos testes
jest.mock('./src/config/auth.js', () => ({
  initAuth: jest.fn(),
  getAuth: jest.fn(() => {
    throw new Error('Better Auth não inicializado. Chame initAuth() primeiro.');
  }),
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  if (console.error.mockRestore) {
    console.error.mockRestore();
  }
  if (console.log.mockRestore) {
    console.log.mockRestore();
  }
});
