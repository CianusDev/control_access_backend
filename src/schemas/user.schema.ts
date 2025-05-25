import { z } from "zod";
import { UserStatus } from "../models/user.model";

export const userSchema = z.object({
    
    nom: z.string({
        required_error: "Le nom est requis",
        invalid_type_error: "Le nom doit être une chaîne de caractères"
    }).min(2),

    prenom: z.string({
        required_error: "Le prénom est requis",
        invalid_type_error: "Le prénom doit être une chaîne de caractères"
    }).min(2),

    email: z.string({
        required_error: "L'email est requis",
        invalid_type_error: "L'email doit être une chaîne de caractères"
    }).email(),

    telephone: z.string().optional(),

    pin: z.string({
        required_error: "Le PIN est requis",
        invalid_type_error: "Le PIN doit être une chaîne de caractères"
    }).optional(),

    password:z.string()
    .min(8,{
        message:"Le mot de passe doit contenir au moins 8 caracteres"
    }),

    role_id: z.string({
        required_error: "Le rôle est requis",
        invalid_type_error: "Le rôle doit être un chaine de caractere"
    }),

    statut: z.nativeEnum(UserStatus).optional(),

    date_expiration: z.coerce.date().optional(),
});

export const userUpdateSchema = userSchema.partial();