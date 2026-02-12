import fakebr from 'faker-br';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
// import TokenUtil from '../utils/TokenUtil.js';
import loadModels from './loadModels.js';
import TokenUtil from '../utils/TokenUtil.js';

export const fakeMappings = {
    common: {
        nome: () => `${fakebr.name.firstName()} ${fakebr.name.lastName()} ${fakebr.name.lastName()}`,
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
        nome: () => `${fakebr.name.firstName()} ${fakebr.name.lastName()} ${fakebr.name.lastName()}`,
        email: () => fakebr.internet.email(),
        senha: () => fakebr.internet.password(),
        ativo: () => fakebr.random.boolean(),
        grupos:() => [],
        tokenUnico: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
        refreshtoken: () => TokenUtil.generateRefreshToken(new mongoose.Types.ObjectId().toString()),
        accesstoken: () => TokenUtil.generateAccessToken(new mongoose.Types.ObjectId().toString()),
        fotoPerfil:() => "",
        tokenConvite: () => uuid(),
        convidadoEm: () => null,
        ativadoEm: () => null
    },

    Notificacao: {
        mensagem: () => {
            const dispositivo = fakeMappings.Componente.nome();
            const quantidade = fakebr.random.number({ min: 1, max: 50 });
            return `${dispositivo} está com estoque baixo (${quantidade} unidades)`;
        },
        data_hora: () => new Date().toISOString(),
        visualizada: () => fakebr.random.boolean(),
        dataLeitura: () => fakebr.random.boolean() ? new Date(Date.now() - fakebr.random.number({ min: 0, max: 86400000 })).toISOString() : null,
        ativo: () => true,
        usuario: () => new mongoose.Types.ObjectId().toString(),
    },

    Categoria: {
        categorias: ["Sensores", "Cabos", "Microcontroladores"],
        nome(index) {
            return this.categorias[index];
        },
        usuario: () => new mongoose.Types.ObjectId().toString(),
        },

        Localizacao: {
        nome: () => `${String.fromCharCode(65 + fakebr.random.number({ min: 0, max: 25 }))}${fakebr.random.number({ min: 1, max: 100 })}`,
        usuario: () => new mongoose.Types.ObjectId().toString(),
        },

        Componente: {
        nomesFixos: [
            "Placa Arduino Uno",
            "Placa Arduino Mega",
            "Sensor de Movimento",
            "Sensor de Temperatura DHT11",
            "Sensor de Umidade DHT22",
            "Display LCD 16x2",
            "Display OLED 0.96",
            "Módulo Relé 4 Canais",
            "Módulo Relé 1 Canal",
            "Módulo Wifi ESP8266",
            "Módulo Bluetooth HC-05",
            "Módulo Ethernet ENC28J60",
            "Microcontrolador ESP32",
            "Microcontrolador ATmega328P",
            "Kit Jumpers 120 peças",
            "Protoboard 400 pontos",
            "Resistor Pack 1k-10M",
            "Capacitor Pack",
            "Sensor Ultrassônico HC-SR04",
            "Módulo Sensor de Luz LDR"
        ],
        nome: () => fakebr.helpers.randomize(fakeMappings.Componente.nomesFixos),
        quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
        estoque_minimo: () => fakebr.random.number({ min: 1, max: 20 }),
        descricao: () => fakebr.lorem.sentence(),
        imagem: () => fakebr.image.imageUrl(),
        categoria: () => new mongoose.Types.ObjectId().toString(),
        ativo: () => true,
        status: () => fakebr.helpers.randomize(['Indisponível', 'Baixo Estoque', 'Em Estoque']),
        usuario: () => new mongoose.Types.ObjectId().toString(),
        },

        Estoque: {
        quantidade: () => fakebr.random.number({ min: 0, max: 100 }),
        componente: () => new mongoose.Types.ObjectId().toString(),
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
        tipos: ["entrada", "saida"],
        tipo: () => fakebr.helpers.randomize(fakeMappings.Movimentacao.tipos),
        data_hora: () => new Date().toISOString(),
        quantidade: () => fakebr.random.number({ min: 1, max: 10 }),
        componente: () => new mongoose.Types.ObjectId().toString(),
        localizacao: () => new mongoose.Types.ObjectId().toString(),
        usuario: () => new mongoose.Types.ObjectId().toString(),
        },

        Orcamento: {
        produtoNome: () => fakebr.commerce.productName(),
        adjetivoNome: () => fakebr.lorem.word(),
        nome: () => `Projeto ${fakeMappings.Orcamento.adjetivoNome()} - ${fakeMappings.Orcamento.produtoNome()}`,
        descricao: () => fakebr.lorem.sentence(),
        total: () => 0, // Será calculado automaticamente pelo middleware
        componentes: () => [], // Será preenchido no seed
        usuario: () => new mongoose.Types.ObjectId().toString(),
    },
};

// Retorna o mapping global, consolidando os mappings comuns e específicos.
// Nesta versão automatizada, carregamos os models e combinamos o mapping comum com o mapping específico de cada model.

export async function getGlobalFakeMapping() {
    const models = await loadModels();
    let globalMapping = { ...fakeMappings.common };

    models.forEach(({ name }) => {
        if (fakeMappings[name]) {
            globalMapping = {
                ...globalMapping,
                ...fakeMappings[name],
            };
        };
    });

    return globalMapping;
};

// Função auxiliar para extrair os nomes dos campos de um schema, considerando apenas os níveis superiores (campos aninhados são verificados pela parte antes do ponto).

function getSchemaFieldNames(schema) {
    const fieldNames = new Set();

    Object.keys(schema.paths).forEach((key) => {
        if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return;
        const topLevel = key.split('.')[0];
        fieldNames.add(topLevel);
    });

    return Array.from(fieldNames);
};

// Valida se o mapping fornecido cobre todos os campos do model.
// Retorna um array com os nomes dos campos que estiverem faltando.

function validateModelMapping(model, modelName, mapping) {
    const fields = getSchemaFieldNames(model.schema);
    const missing = fields.filter((field) => !(field in mapping));

    if (missing.length > 0) {
        console.error(
            `Model ${modelName} está faltando mapeamento para os campos: ${missing.join(', ')}`
        );
    } else {
        console.log(`Model ${modelName} possui mapeamento para todos os campos.`);
    };

    return missing;
};

// Executa a validação para os models fornecidos, utilizando o mapping específico de cada um.

async function validateAllMappings() {
    const models = await loadModels();
    let totalMissing = {};

    models.forEach(({ model, name }) => {
        // Combina os campos comuns com os específicos de cada model.
        const mapping = {
            ...fakeMappings.common,
            ...(fakeMappings[name] || {}),
        };
        const missing = validateModelMapping(model, name, mapping);
        if (missing.length > 0) {
            totalMissing[name] = missing;
        };
    });

    if (Object.keys(totalMissing).length === 0) {
        console.log('globalFakeMapping cobre todos os campos de todos os models.');
        return true;
    } else {
        console.warn('Faltam mapeamentos para os seguintes models:', totalMissing);
        return false;
    };
};

// Executa a validação antes de prosseguir com o seeding ou outras operações.

validateAllMappings()
    .then((valid) => {
        if (valid) {
            console.log('Podemos acessar globalFakeMapping com segurança.');
            // Prossegue com o seeding ou outras operações.
        } else {
            throw new Error('globalFakeMapping não possui todos os mapeamentos necessários.');
        };
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })

export default getGlobalFakeMapping;