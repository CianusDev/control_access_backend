import { z } from "zod";
import { BadgeStatus } from "../models/badge.model";

export const badgeSchema = z.object({
    uid_rfid: z.string({
        required_error: "L'UID RFID est requis",
        invalid_type_error: "L'UID doit être une chaîne de caractères"
    }).min(3),
    utilisateur_id: z.string({

    }).optional(),
    statut: z.nativeEnum(BadgeStatus),
    date_assignation: z.coerce.date().optional(),
    date_expiration: z.coerce.date().optional(),
    commentaire: z.string().optional(),
});


export const updateBadgeSchema =  badgeSchema.partial();