import { z } from "zod";

// Enum pour le statut du badge
export enum BadgeStatus {
    actif = 'actif',
    inactif = 'inactif',
    perdu = 'perdu',
    vole = 'vole',
}

export const badgeSchema = z.object({
    id: z.string().uuid(),
    uid_rfid: z.string(),
    utilisateur_id: z.string().uuid().nullable(),
    statut: z.enum(['actif', 'inactif', 'perdu', 'vole']),
    date_assignation: z.date().nullable(),
    date_expiration: z.date().nullable(),
    commentaire: z.string().nullable(),
    created_at: z.date(),
    updated_at: z.date(),
    proprietaire_nom: z.string().nullable(),
    proprietaire_prenom: z.string().nullable(),
    proprietaire_niveau_acces: z.number().nullable()
});

export type Badge = z.infer<typeof badgeSchema>;