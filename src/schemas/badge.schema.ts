import { z } from "zod";

export const badgeSchema =  
    z.object({
        uid: z
        .string({
            required_error:"uid est requis",
            invalid_type_error:"uid doit etre une chaine de caractere"
        })
        .min(3, {
            message:"uid doit avoir min 3 caractere"
        }),
        user_id: z
        .string({
            required_error:"user_id est requis",
            invalid_type_error:"user_id doit etre une chaine de caractere"
        })
        .min(3, {
            message:"user_id doit avoir min 3 caractere"
        }),
        actif: z
        .boolean({
            required_error:"actif est requis",
            invalid_type_error:"actif doit etre un booléen"
        }),
    })
