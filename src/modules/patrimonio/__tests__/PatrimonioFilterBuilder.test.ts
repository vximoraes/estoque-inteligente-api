import mongoose from 'mongoose';
import PatrimonioFilterBuilder from '../PatrimonioFilterBuilder.js';

describe('PatrimonioFilterBuilder', () => {
  it('deve retornar objeto vazio quando nenhum filtro é aplicado (exceto ativo default)', () => {
    const filtros = new PatrimonioFilterBuilder().build();
    expect(filtros).toEqual({});
  });

  it('comItem deve filtrar por ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder().comItem(id).build();
    expect(filtros['item']).toBeInstanceOf(mongoose.Types.ObjectId);
    expect((filtros['item'] as mongoose.Types.ObjectId).toString()).toBe(id);
  });

  it('comItem deve ignorar ObjectId inválido', () => {
    const filtros = new PatrimonioFilterBuilder().comItem('invalido').build();
    expect(filtros['item']).toBeUndefined();
  });

  it('comStatus deve aceitar apenas valores do enum', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comStatus('Disponível')
      .build();
    expect(filtros['status']).toBe('Disponível');

    const filtrosInvalidos = new PatrimonioFilterBuilder()
      .comStatus('Inexistente')
      .build();
    expect(filtrosInvalidos['status']).toBeUndefined();
  });

  it('comLocalizacao deve filtrar por ObjectId válido', () => {
    const id = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder().comLocalizacao(id).build();
    expect((filtros['localizacao'] as mongoose.Types.ObjectId).toString()).toBe(
      id,
    );
  });

  it('comNumeroPatrimonio deve montar regex case-insensitive (escapando caracteres especiais)', () => {
    const filtros = new PatrimonioFilterBuilder()
      .comNumeroPatrimonio('nb-001')
      .build();
    expect(filtros['numero_patrimonio']).toEqual({
      $regex: 'nb\\-001',
      $options: 'i',
    });
  });

  it('comBusca deve delegar para comNumeroPatrimonio', () => {
    const filtros = new PatrimonioFilterBuilder().comBusca('NB-002').build();
    expect(filtros['numero_patrimonio']).toEqual({
      $regex: 'NB\\-002',
      $options: 'i',
    });
  });

  it('comAtivo deve mapear "true"/"false" para booleano', () => {
    expect(new PatrimonioFilterBuilder().comAtivo('true').build()).toEqual({
      ativo: true,
    });
    expect(new PatrimonioFilterBuilder().comAtivo('false').build()).toEqual({
      ativo: false,
    });
  });

  it('deve encadear múltiplos filtros', () => {
    const itemId = new mongoose.Types.ObjectId().toString();
    const filtros = new PatrimonioFilterBuilder()
      .comItem(itemId)
      .comStatus('Manutenção')
      .comAtivo('true')
      .build();
    expect(filtros['status']).toBe('Manutenção');
    expect(filtros['ativo']).toBe(true);
    expect(filtros['item']).toBeDefined();
  });
});
