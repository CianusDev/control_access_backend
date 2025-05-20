import { z } from "zod";



export const loginSchema = z.object({
    password: z
    .string({
        required_error:"password est requis",
        invalid_type_error:"password doit etre une chaine de caractere"
    })
    .trim()
    .min(8,{
        message:"password doit avoir min 8 caractere"
    }),
    username: z
    .string({
        required_error:"email est requis",
        invalid_type_error:"email doit etre une chaine de caractere"
    })
    .trim(),
})