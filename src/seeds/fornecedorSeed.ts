import { fakeMappings } from './globalFakeMapping.js';
import Fornecedor from '../modules/fornecedor/FornecedorModel.js';

export default async function fornecedorSeed(adminId: string) {
  await Fornecedor.deleteMany({});

  for (let i = 0; i < 10; i++) {
    const fornecedor = {
      nome: fakeMappings.Fornecedor.nome(),
      usuario: adminId,
      url: fakeMappings.Fornecedor.url(),
      contato: fakeMappings.Fornecedor.contato(),
      descricao: fakeMappings.Fornecedor.descricao(),
      ativo: true,
    };

    await Fornecedor.create(fornecedor);
  }
}
