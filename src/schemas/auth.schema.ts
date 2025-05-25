import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string({
            required_error: "L'email est requis",
            invalid_type_error: "L'email doit être une chaîne de caractères"
        })
        .email("Format d'email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});