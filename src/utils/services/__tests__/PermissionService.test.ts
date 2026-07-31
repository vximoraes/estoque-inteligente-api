import PermissionService from '../PermissionService.js';
import UsuarioRepository from '../../../modules/usuario/UsuarioRepository.js';

jest.mock('../../../modules/usuario/UsuarioRepository.js');

const permissao = (overrides = {}) => ({
  rota: 'itens',
  dominio: 'localhost',
  ativo: true,
  buscar: true,
  enviar: false,
  substituir: false,
  modificar: false,
  excluir: false,
  ...overrides,
});

describe('PermissionService', () => {
  let service, repositoryMock;

  beforeEach(() => {
    UsuarioRepository.mockClear();

    repositoryMock = {
      buscarPorIdComGrupos: jest.fn(),
    };

    UsuarioRepository.mockImplementation(() => repositoryMock);

    service = new PermissionService();
  });

  it('permite sempre GET/PATCH/PUT/DELETE do proprio usuario em /usuarios/:id', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'usuarios',
      'localhost',
      'buscar',
      { id: 'user1' },
      'GET',
    );

    expect(result).toBe(true);
  });

  it('não aplica a exceção de self-access se params.id for de outro usuario', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'usuarios',
      'localhost',
      'buscar',
      { id: 'outroUsuario' },
      'GET',
    );

    expect(result).toBe(false);
  });

  it('concede acesso quando o usuario tem a permissao diretamente', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [permissao()],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(true);
  });

  it('concede acesso quando a permissao vem de um grupo populado', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [],
      grupos: [{ permissoes: [permissao()] }],
    });

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(true);
  });

  it('nega quando o metodo pedido esta desligado na permissao', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [permissao({ enviar: false })],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'enviar',
    );

    expect(result).toBe(false);
  });

  it('nega quando a permissao esta inativa', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [permissao({ ativo: false })],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(false);
  });

  it('nega quando rota/dominio nao batem com nenhuma permissao', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [permissao({ rota: 'categorias' })],
      grupos: [],
    });

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(false);
  });

  it('deduplica permissoes repetidas entre usuario e grupos pela combinacao rota+dominio', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue({
      permissoes: [permissao({ buscar: true, enviar: false })],
      grupos: [{ permissoes: [permissao({ buscar: false, enviar: true })] }],
    });

    const resultBuscar = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );
    const resultEnviar = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'enviar',
    );

    expect(resultBuscar).toBe(true);
    expect(resultEnviar).toBe(false);
  });

  it('retorna false e não lança quando usuario não existe', async () => {
    repositoryMock.buscarPorIdComGrupos.mockResolvedValue(null);

    const result = await service.hasPermission(
      'inexistente',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(false);
  });

  it('retorna false quando o repository lança erro', async () => {
    repositoryMock.buscarPorIdComGrupos.mockRejectedValue(
      new Error('DB fora do ar'),
    );

    const result = await service.hasPermission(
      'user1',
      'itens',
      'localhost',
      'buscar',
    );

    expect(result).toBe(false);
  });
});
