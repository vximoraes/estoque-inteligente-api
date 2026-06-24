import mongoose from 'mongoose';
import mongooseSchemaJsonSchema from 'mongoose-schema-jsonschema';
import removeFieldsRecursively from '../../utils/swagger_utils/removeFields.js';
import Item from './ItemModel.js';
import { deepCopy, generateExample } from '../../docs/utils/schemaGenerate.js';

mongooseSchemaJsonSchema(mongoose);

const itemJsonSchema = Item.schema.jsonSchema();
delete itemJsonSchema.properties.__v;

const itensSchemas = {
  ItemFiltro: {
    type: 'object',
    properties: {
      nome: itemJsonSchema.properties.nome,
      quantidade: itemJsonSchema.properties.quantidade,
      estoque_minimo: itemJsonSchema.properties.estoque_minimo,
      categoria: itemJsonSchema.properties.categoria,
      ativo: itemJsonSchema.properties.ativo,
      status: itemJsonSchema.properties.status,
    },
  },
  ItemListagem: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/ItemResumo',
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
    description: 'Schema para listagem paginada de itens',
  },
  ItemResumo: {
    ...deepCopy(itemJsonSchema),
    description: 'Schema para item de item na listagem',
  },
  ItemDetalhes: {
    ...deepCopy(itemJsonSchema),
    description: 'Schema para detalhes de um item',
  },
  ItemPost: {
    ...deepCopy(itemJsonSchema),
    required: ['nome', 'estoque_minimo', 'categoria'],
    description: 'Schema para criação de item',
  },
  ItemPutPatch: {
    ...deepCopy(itemJsonSchema),
    required: [],
    description: 'Schema para atualização de item',
  },
  ItemUploadFotoResposta: {
    type: 'object',
    properties: {
      error: {
        type: 'boolean',
        example: false,
      },
      code: {
        type: 'number',
        example: 201,
      },
      message: {
        type: 'string',
        example: 'Foto enviada com sucesso.',
      },
      data: {
        type: 'object',
        properties: {
          etag: {
            type: 'string',
            example: '3e73f59102c83ab67c509a414c22279e',
          },
          versionId: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
      },
      errors: {
        type: 'array',
        example: [],
      },
    },
    description: 'Schema para resposta de upload de foto do item',
  },
};

const removalMapping = {
  ItemResumo: ['__v'],
  ItemDetalhes: ['__v'],
  ItemPost: ['createdAt', 'updatedAt', '__v', '_id', 'quantidade'],
  ItemPutPatch: ['createdAt', 'updatedAt', '__v', '_id', 'quantidade'],
};

Object.entries(removalMapping).forEach(([schemaKey, fields]) => {
  if (itensSchemas[schemaKey]) {
    removeFieldsRecursively(itensSchemas[schemaKey], fields);
  }
});

const itemMongooseSchema = Item.schema;

itensSchemas.ItemResumo.example = await generateExample(
  itensSchemas.ItemResumo,
  null,
  itemMongooseSchema,
);
itensSchemas.ItemDetalhes.example = await generateExample(
  itensSchemas.ItemDetalhes,
  null,
  itemMongooseSchema,
);
itensSchemas.ItemPost.example = {
  nome: 'Resistor 10k Ohm',
  estoque_minimo: '50',
  descricao: 'Resistor de precisão 1/4W 5%',
  imagem: 'https://exemplo.com/resistor-10k.jpg',
  categoria: '507f1f77bcf86cd799439012',
  ativo: true,
};
itensSchemas.ItemPutPatch.example = {
  nome: 'Resistor 10k Ohm - Atualizado',
  estoque_minimo: '75',
  descricao: 'Resistor de precisão 1/4W 5% - Versão atualizada',
  ativo: true,
};

export default itensSchemas;
