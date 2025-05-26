export enum TypeDataConfig {
    string = 'string',
    integer = 'integer',
    boolean = 'boolean',
    json = 'json',
}

export interface Configuration {
    id: string;
    cle: string;
    valeur: string; // Stockée comme texte, l'application la convertira au bon type
    description?: string;
    type_donnee: TypeDataConfig;
    updated_at: Date;
} 