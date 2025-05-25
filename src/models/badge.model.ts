// Enum pour le statut du badge
export enum BadgeStatus {
    actif = 'actif',
    inactif = 'inactif',
    perdu = 'perdu',
    vole = 'vole',
}

export type Badge = {
    id: string;
    uid_rfid: string;
    utilisateur_id?: string; // FK vers User.id
    statut: BadgeStatus;
    date_assignation?: Date;
    date_expiration?: Date;
    commentaire?: string;
    created_at: Date;
    updated_at: Date;
}