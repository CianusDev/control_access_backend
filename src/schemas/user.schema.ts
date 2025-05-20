import { z } from "zod";

export const userSchema = z.object({
    password: z
    .string({
        required_error:"password est requis",
        invalid_type_error:"password doit etre une chaine de caractere"
    }).optional(),
    email: z
    .string({
        required_error:"email est requis",
        invalid_type_error:"email doit etre une chaine de caractere"
    })
    .email({
        message:"email invalide"
    })
    .trim(),
    username: z
    .string({
        required_error:"username est requis",
        invalid_type_error:"username doit etre une chaine de caractere"
    }).min(3, {
        message:"username doit avoir min 3 caractere"
    })
    .trim(),
    firstname: z
    .string({
        message:"firstname invalide",
        invalid_type_error:"firstname doit etre une chaine de caractere"
    })
    .trim()
    .optional(),
    lastname: z
    .string({
        message:"lastname invalide",
        invalid_type_error:"lastname doit etre une chaine de caractere"
    })
    .trim()
    .optional(),
    role: z.enum(["admin", "security", "user", "root"],{
        message:"role invalide",
        invalid_type_error:"role doit etre une chaine de caractere"
    })
})