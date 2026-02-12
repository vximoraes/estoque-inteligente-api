import mongoose from 'mongoose';
import EstoqueModel from '../../models/Estoque.js';

const estoqueJsonSchema = mongoose.model('estoques').schema.jsonSchema();

const EstoqueBasico = {
    type: "object",
    properties: {
        _id: estoqueJsonSchema.properties._id,
        quantidade: estoqueJsonSchema.properties.quantidade,
        componente: estoqueJsonSchema.properties.componente,
        localizacao: estoqueJsonSchema.properties.localizacao,
        usuario: estoqueJsonSchema.properties.usuario,
        createdAt: estoqueJsonSchema.properties.createdAt,
        updatedAt: estoqueJsonSchema.properties.updatedAt
    },
    required: ["quantidade", "componente", "localizacao", "usuario"],
};

const EstoqueCompleto = {
    type: "object",
    properties: {
        _id: estoqueJsonSchema.properties._id,
        quantidade: estoqueJsonSchema.properties.quantidade,
        componente: { $ref: "#/components/schemas/ComponenteCompleto" },
        localizacao: { $ref: "#/components/schemas/LocalizacaoCompleto" },
        usuario: estoqueJsonSchema.properties.usuario,
        createdAt: estoqueJsonSchema.properties.createdAt,
        updatedAt: estoqueJsonSchema.properties.updatedAt
    },
    required: ["quantidade", "componente", "localizacao", "usuario"],
};

const EstoqueRequest = {
    type: "object",
    properties: {
        quantidade: {
            type: "number",
            minimum: 0,
            description: "Quantidade em estoque"
        },
        componente: {
            type: "string",
            format: "objectid", 
            description: "ID do componente"
        },
        localizacao: {
            type: "string",
            format: "objectid",
            description: "ID da localização"
        }
    },
    required: ["quantidade", "componente", "localizacao"],
};

const EstoqueUpdateRequest = {
    type: "object",
    properties: {
        quantidade: {
            type: "number",
            minimum: 0,
            description: "Nova quantidade em estoque"
        },
        localizacao: {
            type: "string",
            format: "objectid",
            description: "Novo ID da localização"
        }
    }
};

// Exemplos para documentação
const EstoqueExemplo = {
    _id: "507f1f77bcf86cd799439011",
    quantidade: 150,
    componente: "507f1f77bcf86cd799439012",
    localizacao: "507f1f77bcf86cd799439013", 
    usuario: "507f1f77bcf86cd799439014",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
};

const EstoqueCompletoExemplo = {
    _id: "507f1f77bcf86cd799439011",
    quantidade: 150,
    componente: {
        _id: "507f1f77bcf86cd799439012",
        nome: "Resistor 10kΩ",
        codigo: "RES-10K-001",
        descricao: "Resistor de carbono 10kΩ 1/4W 5%",
        quantidade: 500,
        estoque_minimo: 100,
        status: "Em Estoque",
        categoria: "507f1f77bcf86cd799439015"
    },
    localizacao: {
        _id: "507f1f77bcf86cd799439013", 
        nome: "Gaveta A1",
        descricao: "Primeira gaveta do armário A",
        codigo: "A1-001"
    },
    usuario: "507f1f77bcf86cd799439014",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
};

export default {
    EstoqueBasico,
    EstoqueCompleto, 
    EstoqueRequest,
    EstoqueUpdateRequest,
    EstoqueExemplo,
    EstoqueCompletoExemplo
};