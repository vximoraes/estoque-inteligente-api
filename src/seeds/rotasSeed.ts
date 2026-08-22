import Rota from '../modules/rota/RotaModel.js';

export default async function seedRotas() {
  await Rota.deleteMany();

  const rotas_array = [
    'rotas',
    'rotas:id',
    'grupos',
    'grupos:id',
    'usuarios',
    'usuarios:id',
    'usuarios:id/foto',
    'categorias',
    'categorias:id',
    'localizacoes',
    'localizacoes:id',
    'itens',
    'itens:id',
    'itens:id/foto',
    'estoques',
    'estoques:id',
    'fornecedores',
    'fornecedores:id',
    'movimentacoes',
    'movimentacoes:id',
    'emprestimos',
    'emprestimos:id',
    'patrimonios',
    'patrimonios:id',
    'notificacoes',
    'notificacoes:id',
    'orcamentos',
    'orcamentos:id',
    'ia',
  ];

  const rotas = rotas_array.map((rota) => ({
    rota,
    ativo: true,
    buscar: true,
    enviar: true,
    substituir: true,
    modificar: true,
    excluir: true,
  }));

  const result = await Rota.collection.insertMany(rotas);

  return Rota.find();
}
