const AMBIENTES_PERMITIDOS = ['development', 'test'];

export function motivoBloqueioSeed(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const ambiente = env['NODE_ENV'];
  if (AMBIENTES_PERMITIDOS.includes(ambiente ?? '')) return null;
  if (env['SEED_PERMITIR_PRODUCAO'] === 'true') return null;
  return `As seeds apagam as coleções antes de popular. NODE_ENV=${ambiente ?? '(vazio)'} não é development nem test; defina SEED_PERMITIR_PRODUCAO=true para rodar mesmo assim.`;
}
