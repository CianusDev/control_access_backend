export type Permission = {
    id: string;
    role_id: string;
    zone_acces_id: string;
    heure_debut: string; // format HH:mm:ss
    heure_fin: string; // format HH:mm:ss
    jours_semaine: number[]; // 1=Lundi, 7=Dimanche
    actif: boolean;
    created_at: Date;
} 