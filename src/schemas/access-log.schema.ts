import { z } from "zod";
import { AttemptType, AccessResult } from "../models/access-log.model";

export const accessLogSchema = z.object({
    utilisateur_id: z.string().optional(),
    badge_id: z.string().optional(),
    dispositif_id: z.string({
        required_error: "L'identifiant du dispositif est requis",
        invalid_type_error: "Le dispositif doit être un nombre"
    }),
    type_tentative: z.nativeEnum(AttemptType),
    resultat: z.nativeEnum(AccessResult),
    uid_rfid_tente: z.string().optional(),
    adresse_ip: z.string().optional(),
    details: z.any().optional(),
    timestamp: z.coerce.date().optional(),
});