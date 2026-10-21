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

const CONFLITO_DE_INDICE = new Set([85, 86]);

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
