import fakebr from 'faker-br';
import mongoose from 'mongoose';
import loadModels from './loadModels.js';

export const fakeMappings = {
  common: {
    nome: () =>
      `${fakebr.name.firstName()} ${fakebr.name.lastName()} ${fakebr.name.lastName()}`,
    descricao: () => fakebr.lorem.sentence(),
    data_hora: () => new Date().toISOString(),
    quantidade: () => fakebr.random.number({ min: 1, max: 100 }),
    valor_unitario: () => fakebr.commerce.price(1, 1000, 2),
    categoria: () => new mongoose.Types.ObjectId().toString(),
    localizacao: () => new mongoose.Types.ObjectId().toString(),
    rota: () => fakebr.lorem.word(10),
    dominio: () => fakebr.internet.url(),
    ativo: () => fakebr.random.boolean(),
    buscar: () => fakebr.random.boolean(),
    enviar: () => fakebr.random.boolean(),
    substituir: () => fakebr.random.boolean(),
    modificar: () => fakebr.random.boolean(),
    excluir: () => fakebr.random.boolean(),
    permissoes: () => [
      {
        rota: fakebr.lorem.word(),
        dominio: fakebr.internet.url(),
        ativo: fakebr.random.boolean(),
        buscar: fakebr.random.boolean(),
        enviar: fakebr.random.boolean(),
        substituir: fakebr.random.boolean(),
        modificar: fakebr.random.boolean(),
        excluir: fakebr.random.boolean(),
      },
    ],
  },

  Usuario: {
    nome: () =>
      `${fakebr.name.firstName()} ${fakebr.name.lastName()} ${fakebr.name.lastName()}`,
    email: () => fakebr.internet.email(),
    senha: () => `Senha@${fakebr.random.number({ min: 100, max: 999 })}`,
    ativo: () => fakebr.random.boolean(),
    grupos: () => [],
    fotoPerfil: () => '',
    convidadoEm: () => null,
    ativadoEm: () => null,
  },

  Notificacao: {
    mensagem: () => {
      const dispositivo = fakeMappings.Item.nome();
      const quantidade = fakebr.random.number({ min: 1, max: 50 });
      return `${dispositivo} está com estoque baixo (${quantidade} unidades)`;
    },
    data_hora: () => new Date().toISOString(),
    visualizada: () => fakebr.random.boolean(),
    dataLeitura: () =>
      fakebr.random.boolean()
        ? new Date(
            Date.now() - fakebr.random.number({ min: 0, max: 86400000 }),
          ).toISOString()
        : null,
    ativo: () => true,
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Categoria: {
    categorias: [
      'Computadores',
      'Periféricos',
      'Monitores',
      'Acessórios',
      'Rede',
      'Armazenamento',
    ],
    nome(index: number) {
      return this.categorias[index];
    },
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Localizacao: {
    nome: () =>
      `${String.fromCharCode(65 + fakebr.random.number({ min: 0, max: 25 }))}${fakebr.random.number({ min: 1, max: 100 })}`,
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Item: {
    nomesFixos: [
      'Notebook Dell Inspiron 15',
      'Notebook Lenovo ThinkPad E14',
      'MacBook Air M2',
      'Desktop HP ProDesk',
      'Monitor LG 24 polegadas',
      'Monitor Samsung 27 polegadas',
      'Teclado Mecânico Redragon',
      'Mouse Logitech MX Master',
      'Headset HyperX Cloud',
      'Webcam Logitech C920',
      'Dock USB-C Anker',
      'Hub USB 3.0 4 portas',
      'Roteador TP-Link Archer C6',
      'Switch Gigabit 8 portas',
      'Access Point Ubiquiti U6 Lite',
      'SSD NVMe 1TB Kingston',
      'HD Externo Seagate 2TB',
      'Pendrive SanDisk 128GB',
      'Nobreak SMS 1200VA',
      'Projetor Epson PowerLite',
    ],
    nome: () => fakebr.helpers.randomize(fakeMappings.Item.nomesFixos),
    quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
    estoque_minimo: () => fakebr.random.number({ min: 1, max: 20 }),
    descricao: () => fakebr.lorem.sentence(),
    imagem: () => fakebr.image.imageUrl(),
    categoria: () => new mongoose.Types.ObjectId().toString(),
    ativo: () => true,
    status: () =>
      fakebr.helpers.randomize(['Indisponível', 'Baixo Estoque', 'Em Estoque']),
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Estoque: {
    quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
    item: () => new mongoose.Types.ObjectId().toString(),
    localizacao: () => new mongoose.Types.ObjectId().toString(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Fornecedor: {
    nome: () => fakebr.company.companyName(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
    url: () => fakebr.internet.url(),
    contato: () => fakebr.phone.phoneNumber(),
    descricao: () => fakebr.lorem.sentence(),
  },

  Movimentacao: {
    tipos: ['entrada', 'saida'],
    tipo: () => fakebr.helpers.randomize(fakeMappings.Movimentacao.tipos),
    data_hora: () => new Date().toISOString(),
    quantidade: () => fakebr.random.number({ min: 1, max: 10 }),
    item: () => new mongoose.Types.ObjectId().toString(),
    localizacao: () => new mongoose.Types.ObjectId().toString(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Orcamento: {
    produtoNome: () => fakebr.commerce.productName(),
    adjetivoNome: () => fakebr.lorem.word(),
    nome: () =>
      `Projeto ${fakeMappings.Orcamento.adjetivoNome()} - ${fakeMappings.Orcamento.produtoNome()}`,
    descricao: () => fakebr.lorem.sentence(),
    total: () => 0, // Será calculado automaticamente pelo middleware
    itens: () => [], // Será preenchido no seed
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Emprestimo: {
    item: () => new mongoose.Types.ObjectId().toString(),
    quantidade_emprestada: () => fakebr.random.number({ min: 1, max: 20 }),
    quantidade_devolvida: () => fakebr.random.number({ min: 0, max: 10 }),
    quantidade_aberta: () => fakebr.random.number({ min: 0, max: 20 }),
    solicitante_nome: () =>
      `${fakebr.name.firstName()} ${fakebr.name.lastName()}`,
    solicitante_email: () => fakebr.internet.email(),
    data_saida: () => new Date().toISOString(),
    data_prevista_devolucao: () =>
      new Date(
        Date.now() + fakebr.random.number({ min: 1, max: 15 }) * 86400000,
      ).toISOString(),
    data_devolucao_total: () =>
      fakebr.random.boolean() ? new Date().toISOString() : null,
    observacoes_emprestimo: () => fakebr.lorem.sentence(),
    observacoes_devolucao: () => fakebr.lorem.sentence(),
    usuario_responsavel: () => new mongoose.Types.ObjectId().toString(),
    email_atraso_enviado: () => false,
  },

  Conversa: {
    usuario: () => new mongoose.Types.ObjectId().toString(),
    titulo: () => fakebr.lorem.words(5).slice(0, 60),
    mensagens: () => [],
    criada_em: () => new Date().toISOString(),
    atualizada_em: () => new Date().toISOString(),
  },
};

// Retorna o mapping global, consolidando os mappings comuns e específicos.
// Nesta versão automatizada, carregamos os models e combinamos o mapping comum com o mapping específico de cada model.

export async function getGlobalFakeMapping() {
  const models = await loadModels();
  let globalMapping = { ...fakeMappings.common };

  const fm = fakeMappings as Record<string, Record<string, unknown>>;
  models.forEach(({ name }) => {
    if (fm[name]) {
      globalMapping = {
        ...globalMapping,
        ...fm[name],
      };
    }
  });

  return globalMapping;
}

// Função auxiliar para extrair os nomes dos campos de um schema, considerando apenas os níveis superiores (campos aninhados são verificados pela parte antes do ponto).

function getSchemaFieldNames(schema: Record<string, unknown>) {
  const fieldNames = new Set<string>();

  Object.keys(schema['paths'] as object).forEach((key) => {
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return;
    const topLevel = key.split('.')[0]!;
    fieldNames.add(topLevel);
  });

  return Array.from(fieldNames);
}

// Valida se o mapping fornecido cobre todos os campos do model.
// Retorna um array com os nomes dos campos que estiverem faltando.

function validateModelMapping(model: Record<string, unknown>, modelName: string, mapping: Record<string, unknown>) {
  const fields = getSchemaFieldNames(model['schema'] as Record<string, unknown>);
  const missing = fields.filter((field) => !(field in mapping));

  if (missing.length > 0) {
    console.error(
      `Model ${modelName} está faltando mapeamento para os campos: ${missing.join(', ')}`,
    );
  } else {
    console.log(`Model ${modelName} possui mapeamento para todos os campos.`);
  }

  return missing;
}

// Executa a validação para os models fornecidos, utilizando o mapping específico de cada um.

async function validateAllMappings() {
  const models = await loadModels();
  const totalMissing = {};

  const fm2 = fakeMappings as Record<string, Record<string, unknown>>;
  models.forEach(({ model, name }) => {
    // Combina os campos comuns com os específicos de cada model.
    const mapping = {
      ...fakeMappings.common,
      ...(fm2[name] || {}),
    };
    const missing = validateModelMapping(model as Record<string, unknown>, name, mapping);
    if (missing.length > 0) {
      (totalMissing as Record<string, unknown>)[name] = missing;
    }
  });

  if (Object.keys(totalMissing).length === 0) {
    console.log('globalFakeMapping cobre todos os campos de todos os models.');
    return true;
  } else {
    console.warn('Faltam mapeamentos para os seguintes models:', totalMissing);
    return false;
  }
}

// Executa a validação antes de prosseguir com o seeding ou outras operações.

validateAllMappings()
  .then((valid) => {
    if (valid) {
      console.log('Podemos acessar globalFakeMapping com segurança.');
      // Prossegue com o seeding ou outras operações.
    } else {
      throw new Error(
        'globalFakeMapping não possui todos os mapeamentos necessários.',
      );
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export default getGlobalFakeMapping;
