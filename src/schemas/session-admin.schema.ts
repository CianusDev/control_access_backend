import { z } from "zod";

export const sessionAdminSchema = z.object({
    id: z.string({
        required_error: "L'identifiant de session est requis",
        invalid_type_error: "L'identifiant doit être une chaîne de caractères"
    }),
    utilisateur_id: z.number({
        required_error: "L'utilisateur est requis",
        invalid_type_error: "L'utilisateur doit être un nombre"
    }),
    adresse_ip: z.string().optional(),
    user_agent: z.string().optional(),
    expires_at: z.coerce.date(),
    created_at: z.coerce.date().optional(),
}); 