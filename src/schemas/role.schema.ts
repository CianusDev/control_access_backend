import { z } from "zod";

export const roleSchema = z.object({
    nom: z.string({
        required_error: "Le nom du rôle est requis",
        invalid_type_error: "Le nom doit être une chaîne de caractères"
    }).min(3),
    description: z.string().optional(),
    niveau_acces: z.number({
        required_error: "Le niveau d'accès est requis",
        invalid_type_error: "Le niveau d'accès doit être un nombre"
    }).min(1,{
        message: "Le niveau d'accès doit être compris entre 1 et 5"
    }).max(5,{
        message: "Le niveau d'accès doit être compris entre 1 et 5"
    }),
});

export const updateRoleSchema = roleSchema.partial();