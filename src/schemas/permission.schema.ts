import { z } from "zod";

export const permissionSchema = z.object({
    role_id: z.string({
        required_error: "Le rôle est requis",
        invalid_type_error: "Le rôle doit être un nombre"
    }),
    zone_acces_id: z.string({
        required_error: "La zone d'accès est requise",
        invalid_type_error: "La zone d'accès doit être un nombre"
    }),
    heure_debut: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    heure_fin: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    jours_semaine: z.array(z.number().min(1).max(7)),
    actif: z.boolean().default(true),
}); 