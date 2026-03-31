import mongoose from 'mongoose';
import mongooseSchemaJsonSchema from 'mongoose-schema-jsonschema';
import removeFieldsRecursively from '../../utils/swagger_utils/removeFields.js';
import Emprestimo from '../../models/Emprestimo.js';
import { deepCopy, generateExample } from '../utils/schemaGenerate.js';

mongooseSchemaJsonSchema(mongoose);

const emprestimoJsonSchema = Emprestimo.schema.jsonSchema();
delete emprestimoJsonSchema.properties.__v;

const emprestimosSchemas = {
  EmprestimoFiltro: {
    type: 'object',
    properties: {
      item: emprestimoJsonSchema.properties.item,
      localizacao: emprestimoJsonSchema.properties.localizacao,
      solicitante_nome: emprestimoJsonSchema.properties.solicitante_nome,
      apenas_abertos: {
        type: 'boolean',
        description: 'Retorna apenas emprestimos com devolucao pendente',
      },
      atrasados: {
        type: 'boolean',
        description: 'Retorna apenas emprestimos atrasados',
      },
      data_saida_inicio: {
        type: 'string',
        format: 'date',
        description: 'Data inicial de saida (YYYY-MM-DD)',
      },
      data_saida_fim: {
        type: 'string',
        format: 'date',
        description: 'Data final de saida (YYYY-MM-DD)',
      },
    },
  },
  EmprestimoListagem: {
    type: 'object',
    properties: {
      docs: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/EmprestimoItem',
        },
      },
      totalDocs: { type: 'number', example: 100 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 10 },
      page: { type: 'number', example: 1 },
      pagingCounter: { type: 'number', example: 1 },
      hasPrevPage: { type: 'boolean', example: false },
      hasNextPage: { type: 'boolean', example: true },
      prevPage: { type: 'number', nullable: true, example: null },
      nextPage: { type: 'number', example: 2 },
    },
    description: 'Schema para listagem paginada de emprestimos',
  },
  EmprestimoItem: {
    ...deepCopy(emprestimoJsonSchema),
    description: 'Schema para item de emprestimo na listagem',
  },
  EmprestimoDetalhes: {
    ...deepCopy(emprestimoJsonSchema),
    description: 'Schema para detalhes de um emprestimo',
  },
  EmprestimoPost: {
    type: 'object',
    properties: {
      item: emprestimoJsonSchema.properties.item,
      localizacao: emprestimoJsonSchema.properties.localizacao,
      quantidade_emprestada: emprestimoJsonSchema.properties.quantidade_emprestada,
      solicitante_nome: emprestimoJsonSchema.properties.solicitante_nome,
      data_prevista_devolucao: emprestimoJsonSchema.properties.data_prevista_devolucao,
      observacoes_emprestimo:
        emprestimoJsonSchema.properties.observacoes_emprestimo,
    },
    required: [
      'item',
      'localizacao',
      'quantidade_emprestada',
      'solicitante_nome',
    ],
    description: 'Schema para criacao de emprestimo',
  },
  DevolucaoEmprestimoPost: {
    type: 'object',
    properties: {
      quantidade_devolvida: {
        type: 'integer',
        minimum: 1,
        maximum: 999999999,
      },
      observacoes_devolucao:
        emprestimoJsonSchema.properties.observacoes_devolucao,
    },
    required: ['quantidade_devolvida'],
    description: 'Schema para devolucao parcial ou total de emprestimo',
  },
};

const removalMapping = {
  EmprestimoItem: ['__v'],
  EmprestimoDetalhes: ['__v'],
};

Object.entries(removalMapping).forEach(([schemaKey, fields]) => {
  if (emprestimosSchemas[schemaKey]) {
    removeFieldsRecursively(emprestimosSchemas[schemaKey], fields);
  }
});

const emprestimoMongooseSchema = Emprestimo.schema;

emprestimosSchemas.EmprestimoItem.example = await generateExample(
  emprestimosSchemas.EmprestimoItem,
  null,
  emprestimoMongooseSchema,
);
emprestimosSchemas.EmprestimoDetalhes.example = await generateExample(
  emprestimosSchemas.EmprestimoDetalhes,
  null,
  emprestimoMongooseSchema,
);
emprestimosSchemas.EmprestimoPost.example = {
  item: '507f1f77bcf86cd799439011',
  localizacao: '507f1f77bcf86cd799439012',
  quantidade_emprestada: 3,
  solicitante_nome: 'Joao da Silva',
  data_prevista_devolucao: '2026-04-15T10:00:00.000Z',
  observacoes_emprestimo: 'Emprestimo para manutencao externa.',
};
emprestimosSchemas.DevolucaoEmprestimoPost.example = {
  quantidade_devolvida: 1,
  observacoes_devolucao: 'Primeira devolucao parcial.',
};

export default emprestimosSchemas;
