// src/utils/validators/schemas/zod/BaseRotaSchema.js
import { z } from 'zod';
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

export const BaseRotaSchema = z.object({
    _id: objectIdSchema.optional(),
    rota: z.string().min(1,'O campo rota é obrigatório.'),
    dominio: z.string().default('localhost')    
});
