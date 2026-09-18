import mongoose from 'mongoose';
import {
  EmprestimoSchema,
  DevolucaoEmprestimoSchema,
  AtualizarEmprestimoSchema,
} from '../EmprestimoSchema.js';

describe('EmprestimoSchema', () => {
  const item = new mongoose.Types.ObjectId().toString();
  const localizacao = new mongoose.Types.ObjectId().toString();
  const patrimonio = new mongoose.Types.ObjectId().toString();
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  it('deve validar empréstimo por quantidade válido', () => {
    const resultado = EmprestimoSchema.parse({
      item,
      localizacao,
      quantidade_emprestada: 5,
      solicitante_nome: 'Fulano de Tal',
      data_prevista_devolucao: amanha,
    });
    expect(resultado.quantidade_emprestada).toBe(5);
  });

  it('deve validar empréstimo de unidade patrimonial sem item/localizacao/quantidade', () => {
    const resultado = EmprestimoSchema.parse({
      patrimonio,
      solicitante_nome: 'Fulano de Tal',
    });
    expect(resultado.patrimonio).toBe(patrimonio);
  });

  it('deve exigir item quando não há patrimonio', () => {
    expect(() =>
      EmprestimoSchema.parse({
        localizacao,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano de Tal',
      }),
    ).toThrow('Item é obrigatório para empréstimo por quantidade.');
  });

  it('deve exigir localizacao quando não há patrimonio', () => {
    expect(() =>
      EmprestimoSchema.parse({
        item,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano de Tal',
      }),
    ).toThrow('Localização é obrigatória para empréstimo por quantidade.');
  });

  it('deve exigir quantidade_emprestada quando não há patrimonio', () => {
    expect(() =>
      EmprestimoSchema.parse({
        item,
        localizacao,
        solicitante_nome: 'Fulano de Tal',
      }),
    ).toThrow(
      'Quantidade emprestada é obrigatória para empréstimo por quantidade.',
    );
  });

  it('deve exigir solicitante_nome com no mínimo 3 caracteres', () => {
    expect(() =>
      EmprestimoSchema.parse({
        item,
        localizacao,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fu',
      }),
    ).toThrow('Solicitante deve ter no minimo 3 caracteres');
  });

  it('deve rejeitar data prevista de devolução no passado', () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(() =>
      EmprestimoSchema.parse({
        item,
        localizacao,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano de Tal',
        data_prevista_devolucao: ontem,
      }),
    ).toThrow('Data prevista de devolucao deve ser futura');
  });

  it('deve rejeitar e-mail do solicitante inválido', () => {
    expect(() =>
      EmprestimoSchema.parse({
        item,
        localizacao,
        quantidade_emprestada: 5,
        solicitante_nome: 'Fulano de Tal',
        solicitante_email: 'nao-e-email',
      }),
    ).toThrow('E-mail do solicitante invalido');
  });
});

describe('DevolucaoEmprestimoSchema', () => {
  it('deve validar quantidade_devolvida numérica', () => {
    const resultado = DevolucaoEmprestimoSchema.parse({
      quantidade_devolvida: '3',
    });
    expect(resultado.quantidade_devolvida).toBe(3);
  });

  it('deve exigir quantidade_devolvida', () => {
    expect(() => DevolucaoEmprestimoSchema.parse({})).toThrow();
  });
});

describe('AtualizarEmprestimoSchema', () => {
  it('deve aceitar objeto vazio', () => {
    const resultado = AtualizarEmprestimoSchema.parse({});
    expect(resultado.solicitante_nome).toBeUndefined();
  });

  it('deve validar atualização parcial de solicitante_nome', () => {
    const resultado = AtualizarEmprestimoSchema.parse({
      solicitante_nome: 'Novo Nome',
    });
    expect(resultado.solicitante_nome).toBe('Novo Nome');
  });
});
