import { EnviarMensagemSchema, CriarConversaSchema } from '../IASchema.js';

describe('EnviarMensagemSchema', () => {
  it('deve aceitar conteúdo válido', () => {
    const resultado = EnviarMensagemSchema.parse({ content: 'Olá' });
    expect(resultado.content).toBe('Olá');
  });

  it('deve remover caracteres de controle e espaços nas bordas', () => {
    const resultado = EnviarMensagemSchema.parse({
      content: '\x00\x1f  Olá mundo  \x7f',
    });
    expect(resultado.content).toBe('Olá mundo');
  });

  it('deve rejeitar conteúdo vazio após sanitização', () => {
    expect(() => EnviarMensagemSchema.parse({ content: '   ' })).toThrow();
    expect(() => EnviarMensagemSchema.parse({ content: '\x00\x1f' })).toThrow();
  });

  it('deve rejeitar conteúdo ausente', () => {
    expect(() => EnviarMensagemSchema.parse({})).toThrow();
  });

  it('deve rejeitar conteúdo acima de 2000 caracteres', () => {
    const conteudo = 'a'.repeat(2001);
    expect(() => EnviarMensagemSchema.parse({ content: conteudo })).toThrow();
  });

  it('não deve truncar payload de controle até virar válido — deve rejeitar', () => {
    // 2001 caracteres de controle: se a sanitização rodasse depois do corte de
    // tamanho, isso passaria vazio; sanitizar antes garante rejeição por vazio.
    const conteudo = '\x00'.repeat(2001);
    expect(() => EnviarMensagemSchema.parse({ content: conteudo })).toThrow();
  });

  it('deve aceitar exatamente 2000 caracteres', () => {
    const conteudo = 'a'.repeat(2000);
    const resultado = EnviarMensagemSchema.parse({ content: conteudo });
    expect(resultado.content.length).toBe(2000);
  });

  it('deve remover caracteres Unicode invisíveis usados para ofuscar payloads', () => {
    // zero-width space, zero-width non-joiner, right-to-left override,
    // pop directional formatting e BOM intercalados no texto (escapes
    // explícitos de propósito, não colar o glifo invisível no source).
    const codigos = [
      0x4f, 0x6c, 0x200b, 0x61, 0x200c, 0x20, 0x202e, 0x6d, 0x75, 0x6e, 0x64,
      0x6f, 0x202c, 0x20, 0xfeff, 0x21,
    ];
    const conteudo = String.fromCharCode(...codigos);
    const resultado = EnviarMensagemSchema.parse({ content: conteudo });
    expect(resultado.content).toBe('Ola mundo !');
  });

  it('deve rejeitar conteúdo composto só por caracteres invisíveis', () => {
    const conteudo = String.fromCharCode(0x200b, 0x200c, 0x200d, 0xfeff);
    expect(() => EnviarMensagemSchema.parse({ content: conteudo })).toThrow();
  });
});

describe('CriarConversaSchema', () => {
  it('deve aceitar mensagem_inicial ausente', () => {
    const resultado = CriarConversaSchema.parse({});
    expect(resultado.mensagem_inicial).toBeUndefined();
  });

  it('deve sanitizar mensagem_inicial informada', () => {
    const resultado = CriarConversaSchema.parse({
      mensagem_inicial: '  \x00Primeira pergunta\x1f  ',
    });
    expect(resultado.mensagem_inicial).toBe('Primeira pergunta');
  });
});
