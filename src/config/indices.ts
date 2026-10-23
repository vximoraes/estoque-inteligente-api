import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const INDICES_BETTER_AUTH: Record<string, mongoose.mongo.IndexDescription[]> = {
  session: [
    { key: { token: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
  account: [{ key: { userId: 1 } }],
  verification: [
    { key: { identifier: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ],
};

const INDICES_OBSOLETOS: Record<string, string[]> = {
  movimentacoes: ['tipo_1'],
  emprestimos: ['ativo_1'],
  notificacoes: ['mensagem_1'],
};

const CONFLITO_DE_INDICE = new Set([85, 86]);
const INDICE_INEXISTENTE = 27;
const COLECAO_INEXISTENTE = 26;

async function removerIndicesObsoletos(db: mongoose.mongo.Db) {
  for (const [colecao, nomes] of Object.entries(INDICES_OBSOLETOS)) {
    for (const nome of nomes) {
      try {
        await db.collection(colecao).dropIndex(nome);
        logger.info({ colecao, indice: nome }, 'Índices: obsoleto removido');
      } catch (erro) {
        const codigo = (erro as { code?: number }).code;
        if (codigo !== INDICE_INEXISTENTE && codigo !== COLECAO_INEXISTENTE) {
          throw erro;
        }
      }
    }
  }
}

async function criarIndicesDoModel(
  model: Pick<
    mongoose.Model<unknown>,
    'createIndexes' | 'syncIndexes' | 'collection'
  >,
) {
  try {
    await model.createIndexes();
  } catch (erro) {
    if (!CONFLITO_DE_INDICE.has((erro as { code?: number }).code ?? 0)) {
      throw erro;
    }
    logger.warn(
      { colecao: model.collection.name },
      'Índices: índice existente diverge do schema, sincronizando a coleção',
    );
    await model.syncIndexes();
  }
}

export async function garantirIndices(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  const tarefas = [
    { nome: 'índices obsoletos', criar: () => removerIndicesObsoletos(db) },
    ...mongoose.modelNames().map((nome) => ({
      nome,
      criar: () => criarIndicesDoModel(mongoose.model(nome)),
    })),
    ...Object.entries(INDICES_BETTER_AUTH).map(([colecao, indices]) => ({
      nome: colecao,
      criar: () => db.collection(colecao).createIndexes(indices),
    })),
  ];

  const resultados = await Promise.allSettled(
    tarefas.map((tarefa) => tarefa.criar()),
  );

  resultados.forEach((resultado, posicao) => {
    if (resultado.status === 'rejected') {
      logger.error(
        { colecao: tarefas[posicao]?.nome, err: resultado.reason },
        'Índices: falha ao criar (confira dados duplicados ou índice com opções diferentes)',
      );
    }
  });

  const falhas = resultados.filter((r) => r.status === 'rejected').length;
  logger.info(
    `Índices conferidos em ${tarefas.length} coleções (${falhas} com falha).`,
  );
}
