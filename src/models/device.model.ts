// Enum pour le statut du dispositif
export enum DeviceStatus {
    en_ligne = 'en_ligne',
    hors_ligne = 'hors_ligne',
    maintenance = 'maintenance',
}

// Enum pour le type du dispositif
export enum DeviceType {
    actionneur = 'actionneur',
    client = 'client',
}

export type Device = {
    id: string;
    nom: string;
    mac_address: string;
    ip_address?: string;
    zone_acces_id: string;
    statut: DeviceStatus;
    version_firmware?: string;
    type: DeviceType;
    derniere_connexion?: Date;
    created_at: Date;
    updated_at: Date;
}
