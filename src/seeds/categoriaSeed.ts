import { fakeMappings } from './globalFakeMapping.js';
import Categoria from '../modules/categoria/CategoriaModel.js';

export default async function categoriaSeed(adminId: string) {
  await Categoria.deleteMany({});

  for (let i = 0; i < fakeMappings.Categoria.categorias.length; i++) {
    const categoria = {
      nome: fakeMappings.Categoria.nome(i),
      usuario: adminId,
      ativo: true,
    };

    await Categoria.create(categoria);
  }
}
