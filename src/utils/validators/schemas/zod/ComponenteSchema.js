import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';

const ComponenteSchema = z.object({
    nome: z
        .string()
        .refine((val) => !val || val.trim().length > 0, {
            message: "Nome não pode ser vazio",
        })
        .transform((val) => val?.trim()),
    estoque_minimo: z
        .string()
        .transform((val) => (val ? parseInt(val) : undefined))
        .refine((val) => val === undefined || Number.isInteger(val), {
            message: "Estoque mínimo deve ser inteiro",
        })
        .refine((val) => val === undefined || (val >= 0 && val <= 999999999), {
            message: "Estoque mínimo: 0 a 999.999.999",
        }),
    descricao: z
        .string()
        .optional(),
    imagem: z
        .string()
        .optional(),
    categoria: 
        objectIdSchema,
    ativo: z
        .boolean()
        .default(true),
});

const ComponenteUpdateSchema = ComponenteSchema.partial();

export { ComponenteSchema, ComponenteUpdateSchema };