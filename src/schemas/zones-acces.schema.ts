import { z } from "zod";

export const zoneAccesSchema = z.object({
    nom: z.string({
        required_error: "Le nom de la zone est requis",
        invalid_type_error: "Le nom doit être une chaîne de caractères"
    }).min(2),
    description: z.string().optional(),
    niveau_securite: z.number().min(1).max(5),
    actif: z.boolean().default(true),
}); 