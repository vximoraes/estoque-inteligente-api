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
    ativo: () => fakebr.random.boolean(),
    buscar: () => fakebr.random.boolean(),
    enviar: () => fakebr.random.boolean(),
    substituir: () => fakebr.random.boolean(),
    modificar: () => fakebr.random.boolean(),
    excluir: () => fakebr.random.boolean(),
    permissoes: () => [
      {
        rota: fakebr.lorem.word(),
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
    // Categorias de itens de almoxarifado (consumo) e de bens de
    // patrimônio (permanente) precisam ficar em pools separados — é essa
    // separação que `categoriaSeed`/`itemSeed` usam para nunca sortear,
    // por exemplo, "Encanamento" para um notebook.
    categorias: [
      {
        nome: 'Periféricos',
        tipo: 'consumo',
        descricao:
          'Equipamentos de apoio conectados a computadores, como teclados, mouses e headsets.',
      },
      {
        nome: 'Armazenamento',
        tipo: 'consumo',
        descricao:
          'Dispositivos e mídias para armazenamento e backup de dados.',
      },
      {
        nome: 'Cabos e Conectores',
        tipo: 'consumo',
        descricao:
          'Cabos, adaptadores e carregadores usados nos equipamentos do dia a dia.',
      },
      {
        nome: 'Papelaria',
        tipo: 'consumo',
        descricao:
          'Materiais de escritório para uso administrativo e didático.',
      },
      {
        nome: 'Peças e Componentes',
        tipo: 'consumo',
        descricao:
          'Componentes eletrônicos e peças de reposição para manutenção de equipamentos.',
      },
      {
        nome: 'Computadores',
        tipo: 'permanente',
        descricao:
          'Notebooks e desktops utilizados nos setores e laboratórios da instituição.',
      },
      {
        nome: 'Monitores',
        tipo: 'permanente',
        descricao:
          'Monitores de vídeo utilizados em estações de trabalho e laboratórios.',
      },
      {
        nome: 'Rede',
        tipo: 'permanente',
        descricao:
          'Equipamentos de infraestrutura de rede, como roteadores e switches.',
      },
      {
        nome: 'Projeção e Energia',
        tipo: 'permanente',
        descricao: 'Projetores, nobreaks e equipamentos de apoio elétrico.',
      },
      {
        nome: 'Impressoras',
        tipo: 'permanente',
        descricao:
          'Impressoras e multifuncionais utilizadas nos setores administrativos.',
      },
      {
        nome: 'Mobiliário',
        tipo: 'permanente',
        descricao:
          'Mesas, cadeiras e armários utilizados nos setores e laboratórios.',
      },
    ] as { nome: string; tipo: 'consumo' | 'permanente'; descricao: string }[],
    nome(index: number) {
      return this.categorias[index]!.nome;
    },
    tipo(index: number) {
      return this.categorias[index]!.tipo;
    },
    descricao(index: number) {
      return this.categorias[index]!.descricao;
    },
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Localizacao: {
    // Salas e armários de um campus real — cada descrição é escrita para
    // a própria sala, então nome/descricao andam pareados por índice em
    // vez de sorteados de pools independentes.
    salas: [
      {
        nome: 'Laboratório de Informática 1',
        descricao:
          'Sala de aula com estações de trabalho para aulas práticas de informática.',
      },
      {
        nome: 'Laboratório de Informática 2 - Armário 1',
        descricao:
          'Armário de equipamentos reserva do segundo laboratório de informática.',
      },
      {
        nome: 'Laboratório de Redes',
        descricao:
          'Sala equipada para práticas de configuração de redes e servidores.',
      },
      {
        nome: 'Sala de Coordenação de TI',
        descricao:
          'Sala da coordenação responsável pela gestão dos equipamentos de TI.',
      },
      {
        nome: 'Almoxarifado Central',
        descricao:
          'Depósito principal de materiais de consumo e equipamentos aguardando distribuição.',
      },
      {
        nome: 'Almoxarifado Central - Armário 2',
        descricao:
          'Armário do almoxarifado destinado a periféricos e acessórios diversos.',
      },
      {
        nome: 'Secretaria Acadêmica',
        descricao:
          'Sala administrativa responsável pelo atendimento e registros acadêmicos.',
      },
      {
        nome: 'Secretaria Acadêmica - Armário 1',
        descricao:
          'Armário com equipamentos de reserva da secretaria acadêmica.',
      },
      {
        nome: 'Sala dos Professores',
        descricao:
          'Espaço de uso coletivo dos docentes para preparo de aulas e reuniões.',
      },
      {
        nome: 'Biblioteca - Sala Multimídia',
        descricao:
          'Sala da biblioteca equipada para exibição de conteúdo multimídia.',
      },
      {
        nome: 'Auditório Principal',
        descricao:
          'Espaço para eventos, palestras e apresentações institucionais.',
      },
      {
        nome: 'Diretoria - Armário 1',
        descricao:
          'Armário de equipamentos de apoio administrativo da diretoria.',
      },
    ],
    nome(index: number) {
      return this.salas[index]!.nome;
    },
    descricao(index: number) {
      return this.salas[index]!.descricao;
    },
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Item: {
    // Bens de maior valor/individualidade — cada um vira patrimônio
    // (unidade com número próprio), não quantidade agregada. `categoria` e
    // `fabricante` andam junto do nome (em vez de sorteados à parte) pra
    // não sortear, por exemplo, "Dell" como fabricante de uma cadeira.
    nomesPermanentes: [
      {
        nome: 'Notebook Dell Inspiron 15',
        categoria: 'Computadores',
        fabricante: 'Dell',
      },
      {
        nome: 'Notebook Lenovo ThinkPad E14',
        categoria: 'Computadores',
        fabricante: 'Lenovo',
      },
      {
        nome: 'MacBook Air M2',
        categoria: 'Computadores',
        fabricante: 'Apple',
      },
      {
        nome: 'Desktop HP ProDesk',
        categoria: 'Computadores',
        fabricante: 'HP',
      },
      {
        nome: 'Monitor LG 24 polegadas',
        categoria: 'Monitores',
        fabricante: 'LG',
      },
      {
        nome: 'Monitor Samsung 27 polegadas',
        categoria: 'Monitores',
        fabricante: 'Samsung',
      },
      {
        nome: 'Roteador TP-Link Archer C6',
        categoria: 'Rede',
        fabricante: 'TP-Link',
      },
      {
        nome: 'Switch Gigabit 8 portas',
        categoria: 'Rede',
        fabricante: 'Intelbras',
      },
      {
        nome: 'Access Point Ubiquiti U6 Lite',
        categoria: 'Rede',
        fabricante: 'Ubiquiti',
      },
      {
        nome: 'Nobreak SMS 1200VA',
        categoria: 'Projeção e Energia',
        fabricante: 'SMS',
      },
      {
        nome: 'Projetor Epson PowerLite',
        categoria: 'Projeção e Energia',
        fabricante: 'Epson',
      },
      {
        nome: 'Impressora HP LaserJet Pro',
        categoria: 'Impressoras',
        fabricante: 'HP',
      },
      {
        nome: 'Multifuncional Epson EcoTank',
        categoria: 'Impressoras',
        fabricante: 'Epson',
      },
      {
        nome: 'Mesa para Escritório',
        categoria: 'Mobiliário',
        fabricante: 'Cimol',
      },
      {
        nome: 'Cadeira Giratória Ergonômica',
        categoria: 'Mobiliário',
        fabricante: 'Flexform',
      },
      {
        nome: 'Armário de Aço 2 Portas',
        categoria: 'Mobiliário',
        fabricante: 'Pandin',
      },
    ] as { nome: string; categoria: string; fabricante: string }[],
    // Itens de almoxarifado (baixo valor/fungíveis, controlados por
    // quantidade) — `categoria`/`descricao` andam junto do nome pela mesma
    // razão do pool acima.
    nomesConsumo: [
      {
        nome: 'Teclado Mecânico Redragon',
        categoria: 'Periféricos',
        descricao:
          'Teclado mecânico com switches azuis, usado nos laboratórios de informática.',
      },
      {
        nome: 'Mouse Logitech MX Master',
        categoria: 'Periféricos',
        descricao:
          'Mouse sem fio de alta precisão para estações de trabalho administrativas.',
      },
      {
        nome: 'Headset HyperX Cloud',
        categoria: 'Periféricos',
        descricao:
          'Headset com microfone para videochamadas e reuniões remotas.',
      },
      {
        nome: 'Webcam Logitech C920',
        categoria: 'Periféricos',
        descricao:
          'Webcam full HD utilizada em salas de aula híbridas e reuniões online.',
      },
      {
        nome: 'Mousepad Gamer Grande',
        categoria: 'Periféricos',
        descricao: 'Mousepad de mesa inteira para estações de trabalho.',
      },
      {
        nome: 'SSD NVMe 1TB Kingston',
        categoria: 'Armazenamento',
        descricao:
          'Unidade de armazenamento sólido usada em upgrades de desktops e notebooks.',
      },
      {
        nome: 'HD Externo Seagate 2TB',
        categoria: 'Armazenamento',
        descricao:
          'HD externo utilizado para backup de arquivos institucionais.',
      },
      {
        nome: 'Pendrive SanDisk 128GB',
        categoria: 'Armazenamento',
        descricao:
          'Pendrive para transporte e backup de arquivos entre setores.',
      },
      {
        nome: 'Cartão de Memória SD 64GB',
        categoria: 'Armazenamento',
        descricao:
          'Cartão de memória usado em câmeras e dispositivos móveis do setor.',
      },
      {
        nome: 'Dock USB-C Anker',
        categoria: 'Cabos e Conectores',
        descricao: 'Estação de acoplamento USB-C para notebooks corporativos.',
      },
      {
        nome: 'Hub USB 3.0 4 portas',
        categoria: 'Cabos e Conectores',
        descricao: 'Hub USB para expansão de portas em notebooks e desktops.',
      },
      {
        nome: 'Cabo HDMI 2 metros',
        categoria: 'Cabos e Conectores',
        descricao:
          'Cabo HDMI usado para conectar notebooks a monitores e projetores.',
      },
      {
        nome: 'Cabo de Rede Cat6 5 metros',
        categoria: 'Cabos e Conectores',
        descricao: 'Cabo de rede para conexões cabeadas nos laboratórios.',
      },
      {
        nome: 'Carregador Universal para Notebook',
        categoria: 'Cabos e Conectores',
        descricao:
          'Carregador de reposição compatível com as principais marcas de notebook.',
      },
      {
        nome: 'Adaptador USB-C para HDMI',
        categoria: 'Cabos e Conectores',
        descricao:
          'Adaptador para projeção de tela a partir de notebooks com USB-C.',
      },
      {
        nome: 'Resma de Papel A4',
        categoria: 'Papelaria',
        descricao: 'Papel sulfite para impressoras e uso administrativo geral.',
      },
      {
        nome: 'Caneta Esferográfica Azul (caixa)',
        categoria: 'Papelaria',
        descricao: 'Caixa de canetas para uso administrativo e didático.',
      },
      {
        nome: 'Grampeador de Mesa',
        categoria: 'Papelaria',
        descricao: 'Grampeador de uso administrativo para documentos.',
      },
      {
        nome: 'Pasta Suspensa Kraft',
        categoria: 'Papelaria',
        descricao: 'Pasta para arquivamento de documentos em arquivos de aço.',
      },
      {
        nome: 'Bloco de Post-it',
        categoria: 'Papelaria',
        descricao: 'Bloco de notas adesivas para uso administrativo.',
      },
      {
        nome: 'Marcador para Quadro Branco',
        categoria: 'Papelaria',
        descricao: 'Marcador usado em quadros brancos das salas de aula.',
      },
      {
        nome: 'Memória RAM DDR4 8GB',
        categoria: 'Peças e Componentes',
        descricao:
          'Módulo de memória para upgrade e reposição em desktops e notebooks.',
      },
      {
        nome: 'Fonte ATX 500W',
        categoria: 'Peças e Componentes',
        descricao: 'Fonte de alimentação de reposição para desktops.',
      },
      {
        nome: 'Cooler para Processador',
        categoria: 'Peças e Componentes',
        descricao:
          'Cooler de reposição para manutenção de desktops nos laboratórios.',
      },
      {
        nome: 'Pasta Térmica para Processador',
        categoria: 'Peças e Componentes',
        descricao:
          'Pasta térmica usada na manutenção e troca de coolers de processadores.',
      },
      {
        nome: 'Bateria CMOS CR2032',
        categoria: 'Peças e Componentes',
        descricao:
          'Bateria de reposição para a placa-mãe de desktops e notebooks.',
      },
    ] as { nome: string; categoria: string; descricao: string }[],
    nome: () =>
      fakebr.helpers.randomize(
        fakeMappings.Item.nomesConsumo.map((item) => item.nome),
      ),
    quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
    estoque_minimo: () => fakebr.random.number({ min: 1, max: 20 }),
    descricao(nome: string) {
      return (
        this.nomesConsumo.find((item) => item.nome === nome)?.descricao ??
        fakebr.lorem.sentence()
      );
    },
    imagem: () => fakebr.image.imageUrl(),
    categoria: () => new mongoose.Types.ObjectId().toString(),
    ativo: () => true,
    status: () =>
      fakebr.helpers.randomize(['Indisponível', 'Baixo Estoque', 'Em Estoque']),
    usuario: () => new mongoose.Types.ObjectId().toString(),
    tipo: () => 'consumo' as const,
    quantidade_disponivel: () => fakebr.random.number({ min: 0, max: 100 }),
  },

  Patrimonio: {
    numero_patrimonio: () =>
      `PAT-${fakebr.random.number({ min: 1000, max: 9999 })}`,
    modelo: () =>
      fakebr.helpers.randomize(
        fakeMappings.Item.nomesPermanentes.map((item) => item.nome),
      ),
    fabricante: () =>
      fakebr.helpers.randomize(
        fakeMappings.Item.nomesPermanentes.map((item) => item.fabricante),
      ),
    categoria: () => new mongoose.Types.ObjectId().toString(),
    localizacao: () => new mongoose.Types.ObjectId().toString(),
    status: () =>
      fakebr.helpers.randomize([
        'Disponível',
        'Emprestado',
        'Manutenção',
        'Baixado',
      ]),
    data_aquisicao: () => new Date().toISOString(),
    observacoesPool: [
      'Equipamento adquirido para uso no laboratório de informática.',
      'Substituiu unidade anterior danificada por queda de energia.',
      'Recebido como doação de projeto de renovação tecnológica.',
      'Adquirido via processo de licitação para expansão do parque de máquinas.',
      'Unidade de reserva para eventuais manutenções emergenciais.',
      'Equipamento revisado antes da entrada em operação.',
    ],
    observacoes(): string {
      return fakebr.helpers.randomize(this.observacoesPool);
    },
    imagem: () => '',
    campos_personalizados: () => [
      {
        chave: 'Número de série',
        valor: `SN${fakebr.random.number({ min: 100000, max: 999999 })}`,
      },
    ],
    ativo: () => true,
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  PatrimonioEvento: {
    patrimonio: () => new mongoose.Types.ObjectId().toString(),
    tipo: () =>
      fakebr.helpers.randomize([
        'cadastro',
        'emprestimo',
        'devolucao',
        'manutencao_entrada',
        'manutencao_saida',
        'transferencia',
        'baixa',
        'reativacao',
      ]),
    status_anterior: () =>
      fakebr.helpers.randomize(['Disponível', 'Emprestado', 'Manutenção']),
    status_novo: () =>
      fakebr.helpers.randomize(['Disponível', 'Emprestado', 'Manutenção']),
    localizacao_anterior: () => new mongoose.Types.ObjectId().toString(),
    localizacao_nova: () => new mongoose.Types.ObjectId().toString(),
    emprestimo: () => new mongoose.Types.ObjectId().toString(),
    observacoes: () => fakebr.lorem.sentence(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Estoque: {
    quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
    item: () => new mongoose.Types.ObjectId().toString(),
    localizacao: () => new mongoose.Types.ObjectId().toString(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
  },

  Fornecedor: {
    descricoes: [
      'Fornecedor de computadores, notebooks e periféricos de informática.',
      'Distribuidora de equipamentos de rede e infraestrutura de TI.',
      'Fornecedor de monitores e equipamentos de vídeo corporativo.',
      'Loja especializada em suprimentos e acessórios de escritório.',
      'Fornecedor de nobreaks, estabilizadores e equipamentos de energia.',
      'Distribuidora de mídias de armazenamento e backup.',
      'Fornecedor de projetores e equipamentos audiovisuais.',
      'Assistência técnica autorizada para manutenção de equipamentos de TI.',
      'Fornecedor de mobiliário e materiais para laboratórios de informática.',
      'Distribuidora de licenças de software e suporte técnico.',
    ],
    nome: () => fakebr.company.companyName(),
    usuario: () => new mongoose.Types.ObjectId().toString(),
    url: () => fakebr.internet.url(),
    contato: () => fakebr.phone.phoneNumber(),
    descricao(): string {
      return fakebr.helpers.randomize(this.descricoes);
    },
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
    motivosPool: [
      'Necessário para aula prática de laboratório.',
      'Uso em apresentação de trabalho de conclusão de curso.',
      'Solicitado para reunião com equipamentos audiovisuais.',
      'Uso temporário durante manutenção do equipamento fixo do setor.',
      'Necessário para atividade externa da coordenação.',
    ],
    devolucoesPool: [
      'Devolvido em bom estado de conservação.',
      'Apresentou pequeno desgaste no uso, sem danos.',
      'Devolvido com atraso justificado pelo solicitante.',
      'Equipamento testado e aprovado no recebimento.',
      'Devolução parcial, restante ainda em uso.',
    ],
    observacoes_emprestimo(): string {
      return fakebr.helpers.randomize(this.motivosPool);
    },
    observacoes_devolucao(): string {
      return fakebr.helpers.randomize(this.devolucoesPool);
    },
    usuario_responsavel: () => new mongoose.Types.ObjectId().toString(),
    email_atraso_enviado: () => false,
    patrimonio: () => new mongoose.Types.ObjectId().toString(),
    tipo_controle: () => fakebr.helpers.randomize(['quantidade', 'unidade']),
  },

  Conversa: {
    usuario: () => new mongoose.Types.ObjectId().toString(),
    titulo: () => fakebr.lorem.words(5).slice(0, 60),
    mensagens: () => [],
    resumo: () => '',
    resumoAteIndice: () => 0,
    criada_em: () => new Date().toISOString(),
    atualizada_em: () => new Date().toISOString(),
  },

  IAUso: {
    usuario: () => new mongoose.Types.ObjectId().toString(),
    conversa: () => new mongoose.Types.ObjectId().toString(),
    modelo: () => 'gemini-3.5-flash-lite',
    tokens_entrada: () => fakebr.random.number({ min: 100, max: 5000 }),
    tokens_saida: () => fakebr.random.number({ min: 10, max: 1000 }),
    tokens_totais: () => fakebr.random.number({ min: 200, max: 6000 }),
    tokens_pensamento: () => fakebr.random.number({ min: 0, max: 1000 }),
    tokens_cache_leitura: () => fakebr.random.number({ min: 0, max: 1000 }),
    custo_estimado_usd: () => Number(fakebr.commerce.price(0, 1, 6)),
    passos_llm: () => fakebr.random.number({ min: 1, max: 5 }),
    ferramentas_chamadas: () => fakebr.random.number({ min: 0, max: 5 }),
    ferramentas: () =>
      fakebr.helpers
        .shuffle([
          'buscarCategorias',
          'buscarEmprestimos',
          'buscarEstoque',
          'buscarFornecedores',
          'buscarItens',
          'buscarLocalizacoes',
          'buscarMovimentacoes',
          'itensPrioritariosCompra',
          'resumoEstoque',
          'verificarItensAbaixoMinimo',
        ])
        .slice(0, fakebr.random.number({ min: 0, max: 3 })),
    duracao_ms: () => fakebr.random.number({ min: 200, max: 10000 }),
    finalizado_por: () =>
      fakebr.helpers.randomize([
        'concluido',
        'erro',
        'cancelado',
        'tempo_esgotado',
        'limite_passos',
      ]),
    criado_em: () => new Date().toISOString(),
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

function validateModelMapping(
  model: Record<string, unknown>,
  modelName: string,
  mapping: Record<string, unknown>,
) {
  const fields = getSchemaFieldNames(
    model['schema'] as Record<string, unknown>,
  );
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
    const missing = validateModelMapping(
      model as Record<string, unknown>,
      name,
      mapping,
    );
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
