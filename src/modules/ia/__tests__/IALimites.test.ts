import { iniciarStream, finalizarStream } from '../IALimites.js';

describe('IALimites', () => {
  it('deve permitir até o limite de streams simultâneos por usuário', () => {
    const usuario = 'usuario-limites-1';
    expect(iniciarStream(usuario)).toBe(true);
    expect(iniciarStream(usuario)).toBe(true);
    expect(iniciarStream(usuario)).toBe(false);

    finalizarStream(usuario);
    finalizarStream(usuario);
  });

  it('deve liberar o slot ao finalizar, permitindo novo stream', () => {
    const usuario = 'usuario-limites-2';
    expect(iniciarStream(usuario)).toBe(true);
    expect(iniciarStream(usuario)).toBe(true);
    expect(iniciarStream(usuario)).toBe(false);

    finalizarStream(usuario);
    expect(iniciarStream(usuario)).toBe(true);

    finalizarStream(usuario);
    finalizarStream(usuario);
  });

  it('não deve afetar o contador de outro usuário', () => {
    const usuarioA = 'usuario-limites-3a';
    const usuarioB = 'usuario-limites-3b';
    expect(iniciarStream(usuarioA)).toBe(true);
    expect(iniciarStream(usuarioA)).toBe(true);
    expect(iniciarStream(usuarioB)).toBe(true);

    finalizarStream(usuarioA);
    finalizarStream(usuarioA);
    finalizarStream(usuarioB);
  });

  it('finalizarStream deve ser seguro mesmo sem stream em andamento', () => {
    expect(() => finalizarStream('usuario-sem-stream')).not.toThrow();
  });
});
