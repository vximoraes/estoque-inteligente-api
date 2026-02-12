import { z } from 'zod';
import objectIdSchema from '../ObjectIdSchema.js';

const EstoqueQuerySchema = z.object({
    componente: objectIdSchema.optional(),
    localizacao: objectIdSchema.optional(),
    quantidade: z.string().optional(),
    page: z.string().optional(),
    limite: z.string().optional(),
});

const EstoqueIdSchema = objectIdSchema;

export { EstoqueQuerySchema, EstoqueIdSchema };