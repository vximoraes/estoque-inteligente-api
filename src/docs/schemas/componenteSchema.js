import mongoose from 'mongoose';
import mongooseSchemaJsonSchema from 'mongoose-schema-jsonschema';
import removeFieldsRecursively from '../../utils/swagger_utils/removeFields.js';
import Componente from '../../models/Componente.js';
import { deepCopy, generateExample } from '../utils/schemaGenerate.js';

mongooseSchemaJsonSchema(mongoose);

const componenteJsonSchema = Componente.schema.jsonSchema();
delete componenteJsonSchema.properties.__v;

const componentesSchemas = {
    ComponenteFiltro: {
        type: "object",
        properties: {
            nome: componenteJsonSchema.properties.nome,
            quantidade: componenteJsonSchema.properties.quantidade,
            estoque_minimo: componenteJsonSchema.properties.estoque_minimo,
            categoria: componenteJsonSchema.properties.categoria,
            ativo: componenteJsonSchema.properties.ativo,
            status: componenteJsonSchema.properties.status,
        }
    },
    ComponenteListagem: {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: {
                    $ref: "#/components/schemas/ComponenteItem"
                }
            },
            totalDocs: { type: "number", example: 100 },
            limit: { type: "number", example: 10 },
            totalPages: { type: "number", example: 10 },
            page: { type: "number", example: 1 },
            pagingCounter: { type: "number", example: 1 },
            hasPrevPage: { type: "boolean", example: false },
            hasNextPage: { type: "boolean", example: true },
            prevPage: { type: "number", nullable: true, example: null },
            nextPage: { type: "number", example: 2 }
        },
        description: "Schema para listagem paginada de componentes"
    },
    ComponenteItem: {
        ...deepCopy(componenteJsonSchema),
        description: "Schema para item de componente na listagem"
    },
    ComponenteDetalhes: {
        ...deepCopy(componenteJsonSchema),
        description: "Schema para detalhes de um componente"
    },
    ComponentePost: {
        ...deepCopy(componenteJsonSchema),
        required: ["nome", "estoque_minimo", "categoria"],
        description: "Schema para criação de componente"
    },
    ComponentePutPatch: {
        ...deepCopy(componenteJsonSchema),
        required: [],
        description: "Schema para atualização de componente"
    },
    ComponenteUploadFotoResposta: {
        type: "object",
        properties: {
            error: {
                type: "boolean",
                example: false
            },
            code: {
                type: "number",
                example: 201
            },
            message: {
                type: "string",
                example: "Foto enviada com sucesso."
            },
            data: {
                type: "object",
                properties: {
                    etag: {
                        type: "string",
                        example: "3e73f59102c83ab67c509a414c22279e"
                    },
                    versionId: {
                        type: "string",
                        nullable: true,
                        example: null
                    }
                }
            },
            errors: {
                type: "array",
                example: []
            }
        },
        description: "Schema para resposta de upload de foto do componente"
    }
};

const removalMapping = {
    ComponenteItem: ['__v'],
    ComponenteDetalhes: ['__v'],
    ComponentePost: ['createdAt', 'updatedAt', '__v', '_id', 'quantidade'],
    ComponentePutPatch: ['createdAt', 'updatedAt', '__v', '_id', 'quantidade']
}

Object.entries(removalMapping).forEach(([schemaKey, fields]) => {
    if (componentesSchemas[schemaKey]) {
        removeFieldsRecursively(componentesSchemas[schemaKey], fields);
    }
});

const componenteMongooseSchema = Componente.schema;

componentesSchemas.ComponenteItem.example = await generateExample(componentesSchemas.ComponenteItem, null, componenteMongooseSchema);
componentesSchemas.ComponenteDetalhes.example = await generateExample(componentesSchemas.ComponenteDetalhes, null, componenteMongooseSchema);
componentesSchemas.ComponentePost.example = {
    nome: "Resistor 10k Ohm",
    estoque_minimo: "50",
    descricao: "Resistor de precisão 1/4W 5%",
    imagem: "https://exemplo.com/resistor-10k.jpg",
    categoria: "507f1f77bcf86cd799439012",
    ativo: true
};
componentesSchemas.ComponentePutPatch.example = {
    nome: "Resistor 10k Ohm - Atualizado",
    estoque_minimo: "75",
    descricao: "Resistor de precisão 1/4W 5% - Versão atualizada",
    ativo: true
};

export default componentesSchemas;