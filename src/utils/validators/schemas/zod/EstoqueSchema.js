import { z } from 'zod';
import objectIdSchema from './ObjectIdSchema.js';

const EstoqueSchema = z.object({
    quantidade: z
        .number()
        .min(0, { message: "Quantidade mínima: 0" })
        .max(999999999, { message: "Quantidade máxima: 999.999.999" })
        .or(z.string().transform((val) => {
            const num = Number(val);
            if (isNaN(num)) {
                throw new Error("Quantidade inválida");
            }
            if (num < 0) {
                throw new Error("Quantidade mínima: 0");
            }
            if (num > 999999999) {
                throw new Error("Quantidade máxima: 999.999.999");
            }
            return num;
        })),
    componente: objectIdSchema,
    localizacao: objectIdSchema,
});

const EstoqueUpdateSchema = EstoqueSchema.partial();

export { EstoqueSchema, EstoqueUpdateSchema };