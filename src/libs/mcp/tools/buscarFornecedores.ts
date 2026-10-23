import FornecedorModel from '../../../modules/fornecedor/FornecedorModel.js';
import type { FilterQuery } from 'mongoose';
import type { FornecedorDocument } from '../../../modules/fornecedor/FornecedorModel.js';
import { escapeRegex } from '../../../utils/helpers/escapeRegex.js';
import { resultadoLimitado } from '../resultadoLimitado.js';

export async function buscarFornecedores(
  { nome }: { nome?: string } = {},
  _usuarioId: string,
) {
  const filtros: FilterQuery<FornecedorDocument> = { ativo: true };

  if (nome) filtros['nome'] = { $regex: escapeRegex(nome), $options: 'i' };

  const fornecedores = await FornecedorModel.find(filtros)
    .sort({ nome: 1 })
    .lean();

  const registros = fornecedores.map((f) => {
    const fObj = f as Record<string, unknown>;
    return {
      id: f._id,
      nome: f.nome,
      contato: fObj['contato'] ?? null,
      url: fObj['url'] ?? null,
      descricao: fObj['descricao'] ?? null,
    };
  });

  return resultadoLimitado(registros, registros.length);
}
