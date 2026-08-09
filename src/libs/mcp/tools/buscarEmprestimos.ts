import EmprestimoModel from '../../../modules/emprestimo/EmprestimoModel.js';

export async function buscarEmprestimos(
  {
    status,
    solicitanteNome,
    limite = 20,
  }: { status?: string; solicitanteNome?: string; limite?: number },
  _usuarioId: string,
) {
  const filtros: Record<string, unknown> = { ativo: true };

  if (solicitanteNome) {
    filtros['solicitante_nome'] = { $regex: solicitanteNome, $options: 'i' };
  }

  const emprestimos = await EmprestimoModel.find(filtros)
    .populate('item', 'nome')
    .populate('localizacao', 'nome')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limite) * 3, 150))
    .lean();

  const hoje = new Date();
  const comStatus = emprestimos.map((e) => {
    const eObj = e as Record<string, unknown>;
    let statusCalculado: string;
    const quantidadeAberta = Number(eObj['quantidade_aberta'] ?? 0);
    const dataPrevista = eObj['data_prevista_devolucao'];
    if (quantidadeAberta <= 0) {
      statusCalculado = 'Devolvido';
    } else if (dataPrevista && new Date(dataPrevista as string) < hoje) {
      statusCalculado = 'Atrasado';
    } else {
      statusCalculado = 'Ativo';
    }
    return { ...eObj, statusCalculado };
  });

  const filtrados: Record<string, unknown>[] = (status
    ? comStatus.filter((e) => e['statusCalculado'] === status)
    : comStatus) as unknown as Record<string, unknown>[];

  return filtrados.slice(0, Math.min(Number(limite), 50)).map((e) => {
    const item = e['item'] as Record<string, unknown> | null;
    const localizacao = e['localizacao'] as Record<string, unknown> | null;
    return {
      item: item?.['nome'] ?? null,
      localizacao: localizacao?.['nome'] ?? null,
      solicitante: e['solicitante_nome'],
      quantidade_emprestada: e['quantidade_emprestada'],
      quantidade_devolvida: e['quantidade_devolvida'],
      quantidade_aberta: e['quantidade_aberta'],
      data_prevista_devolucao: e['data_prevista_devolucao'],
      status: e['statusCalculado'],
    };
  });
}
