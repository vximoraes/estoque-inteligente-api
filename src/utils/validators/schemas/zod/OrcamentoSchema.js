import { z } from 'zod';
import mongoose from 'mongoose';

const ItemOrcamentoSchema = z.object({
    item: z
        .string()
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "ID do item deve ser um ObjectId válido",
        }),
    fornecedor: z
        .string()
        .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "ID do fornecedor deve ser um ObjectId válido",
        }),
    quantidade: z
        .number()
        .int()
        .min(1, { message: "Quantidade mínima: 1" })
        .max(999999999, { message: "Quantidade máxima: 999.999.999" })
        .or(z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0 && val <= 999999999, {
            message: "Quantidade: 1 a 999.999.999",
        })),
    valor_unitario: z
        .number()
        .min(0, { message: "Valor unitário deve ser maior ou igual a zero" })
        .or(z.string().transform((val) => parseFloat(val)).refine((val) => !isNaN(val) && val >= 0, {
            message: "Valor unitário deve ser um número válido maior ou igual a zero",
        })),
});

const OrcamentoSchema = z.object({
    nome: z
        .string()
        .min(1, { message: "Nome é obrigatório" })
        .refine((val) => val.trim().length > 0, {
            message: "Nome não pode ser vazio",
        })
        .transform((val) => val.trim()),
    descricao: z
        .string()
        .optional(),
    items: z
        .array(ItemOrcamentoSchema)
        .min(1, { message: "Deve haver pelo menos um item no orçamento." }),
});

const OrcamentoUpdateSchema = OrcamentoSchema.omit({ items: true }).partial();
const ItemOrcamentoUpdateSchema = ItemOrcamentoSchema.partial();

export { OrcamentoSchema, OrcamentoUpdateSchema, ItemOrcamentoSchema, ItemOrcamentoUpdateSchema };