import { z } from "zod";
import { BadgeStatus } from "../models/badge.model";

export const badgeSchema = z.object({
    uid_rfid: z.string().min(1),
    utilisateur_id: z.string().uuid().optional(),
    statut: z.enum([BadgeStatus.actif, BadgeStatus.inactif, BadgeStatus.perdu, BadgeStatus.vole]).default(BadgeStatus.actif),
    date_assignation: z.date().optional(),
    date_expiration: z.coerce.date().optional(),
    commentaire: z.string().optional(),
});

export const updateBadgeSchema = badgeSchema.partial();