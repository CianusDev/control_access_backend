import { z } from "zod";
import { AlertType, AlertLevel, AlertStatus } from "../models/alert.model";

export const alertSchema = z.object({
    type_alerte: z.nativeEnum(AlertType),
    titre: z.string({
        required_error: "Le titre est requis",
        invalid_type_error: "Le titre doit être une chaîne de caractères"
    }),
    message: z.string({
        required_error: "Le message est requis",
        invalid_type_error: "Le message doit être une chaîne de caractères"
    }),
    niveau_gravite: z.nativeEnum(AlertLevel),
    utilisateur_id: z.string().optional(),
    dispositif_id: z.string().optional(),
    log_acces_id: z.string().optional(),
    statut: z.nativeEnum(AlertStatus).optional(),
    assignee_admin_id: z.string().optional(),
    date_traitement: z.coerce.date().optional(),
    commentaire_traitement: z.string().optional(),
    created_at: z.coerce.date().optional(),
});