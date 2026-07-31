const mockGetSession = jest.fn();
const mockFindOne = jest.fn();
const mockHasPermission = jest.fn();

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(() => ({})),
}));

jest.mock('../../config/auth.js', () => ({
  getAuth: () => ({ api: { getSession: mockGetSession } }),
}));

jest.mock('../../modules/rota/RotaModel.js', () => ({
  __esModule: true,
  default: { findOne: (...args) => mockFindOne(...args) },
}));

jest.mock('../../utils/services/PermissionService.js', () => {
  return jest.fn().mockImplementation(() => ({
    hasPermission: (...args) => mockHasPermission(...args),
  }));
});

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('AuthPermission', () => {
  let authPermission;

  beforeAll(async () => {
    authPermission = (await import('../AuthPermission.js')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 401 quando não há sessão válida', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = { url: '/itens', method: 'GET', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a rota não está registrada', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue(null);
    const req = {
      url: '/rotaqualquer',
      method: 'GET',
      params: {},
      headers: {},
    };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna 405 quando o método HTTP não é mapeado', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue({ ativo: true, buscar: true });
    const req = { url: '/itens', method: 'OPTIONS', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('retorna 403 quando a rota está inativa', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue({ ativo: false, buscar: true });
    const req = { url: '/itens', method: 'GET', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockHasPermission).not.toHaveBeenCalled();
  });

  it('retorna 403 quando o verbo pedido está desligado na rota', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue({ ativo: true, buscar: false });
    const req = { url: '/itens', method: 'GET', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('retorna 403 quando o usuario não tem a permissão', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue({
      ativo: true,
      buscar: true,
      dominio: 'localhost',
    });
    mockHasPermission.mockResolvedValue(false);
    const req = { url: '/itens', method: 'GET', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('chama next() e anexa o usuario na requisição quando permitido', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user1' } });
    mockFindOne.mockResolvedValue({
      ativo: true,
      buscar: true,
      dominio: 'localhost',
    });
    mockHasPermission.mockResolvedValue(true);
    const req = { url: '/itens', method: 'GET', params: {}, headers: {} };
    const res = buildRes();
    const next = jest.fn();

    await authPermission(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user_id).toBe('user1');
    expect(req.user).toEqual({ id: 'user1' });
  });
});
