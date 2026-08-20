jest.mock('../UsuarioRepository.js', () => {
  return jest.fn().mockImplementation(() => ({
    atualizar: jest.fn(),
  }));
});

jest.mock('../../grupo/GrupoRepository.js', () => {
  return jest.fn().mockImplementation(() => ({
    buscarPorNome: jest.fn(),
  }));
});

import { ativarUsuarioPadrao } from '../ativarUsuarioPadrao.js';
import UsuarioRepository from '../UsuarioRepository.js';
import GrupoRepository from '../../grupo/GrupoRepository.js';

describe('ativarUsuarioPadrao', () => {
  let usuarioRepositoryInstance;
  let grupoRepositoryInstance;

  beforeEach(() => {
    usuarioRepositoryInstance = UsuarioRepository.mock.results[0].value;
    grupoRepositoryInstance = GrupoRepository.mock.results[0].value;
    usuarioRepositoryInstance.atualizar.mockClear();
    grupoRepositoryInstance.buscarPorNome.mockClear();
  });

  it('deve ativar usuário com as permissões do grupo "Usuario" quando existir', async () => {
    grupoRepositoryInstance.buscarPorNome.mockResolvedValue({
      permissoes: [{ rota: 'itens' }],
    });
    usuarioRepositoryInstance.atualizar.mockResolvedValue({
      _id: '1',
      ativo: true,
    });

    const resultado = await ativarUsuarioPadrao('1');

    expect(grupoRepositoryInstance.buscarPorNome).toHaveBeenCalledWith(
      'Usuario',
    );
    expect(usuarioRepositoryInstance.atualizar).toHaveBeenCalledWith('1', {
      ativo: true,
      ativadoEm: expect.any(Date),
      convidadoEm: null,
      permissoes: [{ rota: 'itens' }],
    });
    expect(resultado).toEqual({ _id: '1', ativo: true });
  });

  it('deve ativar usuário sem permissões quando grupo "Usuario" não existir', async () => {
    grupoRepositoryInstance.buscarPorNome.mockResolvedValue(null);
    usuarioRepositoryInstance.atualizar.mockResolvedValue({ _id: '1' });

    await ativarUsuarioPadrao('1');

    expect(usuarioRepositoryInstance.atualizar).toHaveBeenCalledWith('1', {
      ativo: true,
      ativadoEm: expect.any(Date),
      convidadoEm: null,
      permissoes: [],
    });
  });

  it('deve ativar usuário sem permissões quando busca do grupo falhar', async () => {
    grupoRepositoryInstance.buscarPorNome.mockRejectedValue(
      new Error('falha de conexão'),
    );
    usuarioRepositoryInstance.atualizar.mockResolvedValue({ _id: '1' });

    await ativarUsuarioPadrao('1');

    expect(usuarioRepositoryInstance.atualizar).toHaveBeenCalledWith('1', {
      ativo: true,
      ativadoEm: expect.any(Date),
      convidadoEm: null,
      permissoes: [],
    });
  });
});
