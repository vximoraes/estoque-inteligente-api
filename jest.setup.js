process.env.NODE_ENV = 'test'

// Mock do MinIO para evitar problemas nos testes
jest.mock('./src/config/MinIO.js', () => ({
    default: {
        putObject: jest.fn().mockResolvedValue({
            etag: 'mocked-etag',
            versionId: null
        }),
        bucketExists: jest.fn().mockResolvedValue(true),
        makeBucket: jest.fn().mockResolvedValue(),
        setBucketPolicy: jest.fn().mockResolvedValue()
    }
}));

// Mock do SharpConfig para evitar problemas nos testes
jest.mock('./src/config/SharpConfig.js', () => ({
    default: jest.fn().mockImplementation((buffer) => Promise.resolve(buffer))
}));

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
});

afterAll(() => {
    if (console.error.mockRestore) {
        console.error.mockRestore();
    }
    if (console.log.mockRestore) {
        console.log.mockRestore();
    }
});