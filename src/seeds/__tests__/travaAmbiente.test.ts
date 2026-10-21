import { motivoBloqueioSeed } from '../travaAmbiente.js';

describe('motivoBloqueioSeed', () => {
  it('libera em development e test', () => {
    expect(motivoBloqueioSeed({ NODE_ENV: 'development' })).toBeNull();
    expect(motivoBloqueioSeed({ NODE_ENV: 'test' })).toBeNull();
  });

  it('bloqueia em production', () => {
    expect(motivoBloqueioSeed({ NODE_ENV: 'production' })).toContain(
      'NODE_ENV=production',
    );
  });

  it('bloqueia sem NODE_ENV', () => {
    expect(motivoBloqueioSeed({})).toContain('(vazio)');
  });

  it('libera em production só com SEED_PERMITIR_PRODUCAO=true', () => {
    expect(
      motivoBloqueioSeed({
        NODE_ENV: 'production',
        SEED_PERMITIR_PRODUCAO: 'true',
      }),
    ).toBeNull();
    expect(
      motivoBloqueioSeed({
        NODE_ENV: 'production',
        SEED_PERMITIR_PRODUCAO: '1',
      }),
    ).not.toBeNull();
  });
});
