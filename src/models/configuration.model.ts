export enum ConfigDataType {
    string = 'string',
    integer = 'integer',
    boolean = 'boolean',
    json = 'json',
}

export type Configuration = {
    id: string;
    cle: string;
    valeur: string;
    description?: string;
    type_donnee: ConfigDataType;
    updated_at: Date;
} 