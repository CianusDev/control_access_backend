export type ZoneAcces = {
    id: number;
    nom: string;
    description?: string;
    niveau_securite: number; // 1 à 5
    actif: boolean;
    created_at: Date;
    updated_at: Date;
} 