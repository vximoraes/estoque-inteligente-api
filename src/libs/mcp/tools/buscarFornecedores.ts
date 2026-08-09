import FornecedorModel from '../../../modules/fornecedor/FornecedorModel.js';
import type { FilterQuery } from 'mongoose';
import type { FornecedorDocument } from '../../../modules/fornecedor/FornecedorModel.js';

export async function buscarFornecedores(
  { nome }: { nome?: string } = {},
  _usuarioId: string,
) {
  const filtros: FilterQuery<FornecedorDocument> = { ativo: true };

  if (nome) filtros['nome'] = { $regex: nome, $options: 'i' };

  const fornecedores = await FornecedorModel.find(filtros)
    .sort({ nome: 1 })
    .lean();

  return fornecedores.map((f) => {
    const fObj = f as Record<string, unknown>;
    return {
      id: f._id,
      nome: f.nome,
      contato: fObj['contato'] ?? null,
      email: fObj['email'] ?? null,
    };
  });
}
