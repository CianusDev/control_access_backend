import { z } from "zod";
import { BadgeStatus } from "../models/badge.model";

export const badgeSchema = z.object({
    uid_rfid: z.string().min(1),
    utilisateur_id: z.string().uuid().optional(),
    statut: z.enum([BadgeStatus.actif, BadgeStatus.inactif, BadgeStatus.perdu, BadgeStatus.vole]).default(BadgeStatus.actif),
    date_assignation: z.date().optional(),
    date_expiration: z.date().optional(),
    commentaire: z.string().optional(),
    // proprietaire_nom: z.string().optional(),
    // proprietaire_prenom: z.string().optional(),
    // proprietaire_niveau_acces: z.number().optional()
});

export const updateBadgeSchema = badgeSchema.partial();