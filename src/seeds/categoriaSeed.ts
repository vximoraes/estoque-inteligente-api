import { fakeMappings } from './globalFakeMapping.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function categoriaSeed(adminId: string) {
  await Categoria.deleteMany({});

  for (let i = 0; i < fakeMappings.Categoria.categorias.length; i++) {
    const categoria = {
      nome: fakeMappings.Categoria.nome(i),
      tipo: fakeMappings.Categoria.tipo(i),
      usuario: adminId,
      ativo: true,
      descricao: fakeMappings.Categoria.descricao(i),
    };

    await Categoria.create(categoria);
  }
}
