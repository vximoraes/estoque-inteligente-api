import FornecedorModel from '../../modules/fornecedor/FornecedorModel.js';

export async function buscarFornecedores({ nome } = {}, _usuarioId) {
  const filtros = { ativo: true };

  if (nome) filtros.nome = { $regex: nome, $options: 'i' };

  const fornecedores = await FornecedorModel.find(filtros).sort({ nome: 1 }).lean();

  return fornecedores.map((f) => ({
    id: f._id,
    nome: f.nome,
    contato: f.contato ?? null,
    email: f.email ?? null,
  }));
}
