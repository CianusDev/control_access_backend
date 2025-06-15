// Enums pour type_tentative et resultat_acces
export enum AttemptType {
    badge_seul = 'badge_seul',
    pin_seul = 'pin_seul',
    badge_pin = 'badge_pin',
    inconnu = 'inconnu',
    verrou = 'verrou'
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

    echec_dispositif_introuvable = 'echec_dispositif_introuvable',
    echec_communication_dispositif = 'echec_communication_dispositif',
    echec_identification_dispositif = 'echec_identification_dispositif',
    echec_dispositif_hors_ligne = 'echec_dispositif_hors_ligne',
    echec_dispositif_erreur = 'echec_dispositif_erreur',
    erreur_interne = 'erreur_interne'


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
    // Nouveaux champs
    proprietaire_nom?: string;
    proprietaire_prenom?: string;
    dispositif_nom?: string;
    badge_numero?: string;
}