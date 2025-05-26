// Enums pour type_tentative et resultat_acces
export enum AttemptType {
    badge_seul = 'badge_seul',
    pin_seul = 'pin_seul',
    badge_pin = 'badge_pin',
    inconnu = 'inconnu',
}

export enum AccessResult {
    succes = 'succes',
    echec_badge = 'echec_badge',
    echec_pin = 'echec_pin',
    echec_permission = 'echec_permission',
    echec_horaire = 'echec_horaire',
    echec_inconnu = 'echec_inconnu',
    echec_utilisateur_inactif = 'echec_utilisateur_inactif',
    echec_utilisateur_verrouille = 'echec_utilisateur_verrouille',
}

export type AccessLog = {
    id: string;
    utilisateur_id?: string;
    badge_id?: string;
    dispositif_id: string;
    type_tentative: AttemptType;
    resultat: AccessResult;
    uid_rfid_tente?: string;
    adresse_ip?: string;
    details?: any; // JSONB
    timestamp: Date;
}