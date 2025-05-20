import { z } from "zod";

export const roleSchema = z.object({
    name: z
    .string({
        required_error:"name est requis",
        invalid_type_error:"name doit etre une chaine de caractere"
    })
    .min(3, {
        message:"name doit avoir min 3 caractere"
    }),
})