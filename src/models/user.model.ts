// Enums pour le statut utilisateur
export enum UserStatus {
    actif = 'actif',
    inactif = 'inactif',
    suspendu = 'suspendu',
}

export type User = {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    pin_hash: string | null;
    password_hash: string | null;
    role_id: string;
    statut: UserStatus;
    date_expiration?: Date;
    tentatives_echec: number;
    derniere_tentative?: Date;
    verrouille_jusqu?: Date;
    created_at: Date;
    updated_at: Date;
}
