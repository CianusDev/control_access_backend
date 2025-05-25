export type Role = {
    id: string;
    nom: string;
    description?: string;
    niveau_acces: number; // 1 à 5
    created_at: Date;
    updated_at: Date;
}