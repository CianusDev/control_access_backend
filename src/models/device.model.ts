// Enum pour le statut du dispositif
export enum DeviceStatus {
    en_ligne = 'en_ligne',
    hors_ligne = 'hors_ligne',
    maintenance = 'maintenance',
}

export type Device = {
    id: string;
    nom: string;
    mac_address: string;
    ip_address?: string;
    zone_acces_id: string;
    statut: DeviceStatus;
    version_firmware?: string;
    derniere_connexion?: Date;
    created_at: Date;
    updated_at: Date;
}
