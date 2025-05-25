// Enums pour type_alerte, niveau_gravite, statut_alerte
export enum AlertType {
    tentative_intrusion = 'tentative_intrusion',
    badge_perdu = 'badge_perdu',
    dispositif_offline = 'dispositif_offline',
    echecs_multiples = 'echecs_multiples',
    access_refuse = 'access_refuse',
}

export enum AlertLevel {
    info = 'info',
    warning = 'warning',
    error = 'error',
    critical = 'critical',
}

export enum AlertStatus {
    nouvelle = 'nouvelle',
    vue = 'vue',
    traitee = 'traitee',
    ignoree = 'ignoree',
}

export type Alert = {
    id: string;
    type_alerte: AlertType;
    titre: string;
    message: string;
    niveau_gravite: AlertLevel;
    utilisateur_id?: string;
    dispositif_id?: string;
    log_acces_id?: string;
    statut: AlertStatus;
    assignee_admin_id?: string;
    date_traitement?: Date;
    commentaire_traitement?: string;
    created_at: Date;
}