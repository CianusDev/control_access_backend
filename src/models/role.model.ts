export interface Role {
    id: string;
    nom: string;
    description?: string;
    niveau_acces: number; // INTEGER en SQL, mappé à number en TS
    created_at: Date;
    updated_at: Date;
}