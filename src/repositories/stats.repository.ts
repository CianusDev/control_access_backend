import { query } from "../config/database";

export interface DashboardStats {
    stats_temps_reel: {
        acces_derniere_heure: number;
        acces_24h: number;
        echecs_derniere_heure: number;
        utilisateurs_actifs_24h: number;
    };
    activite_30_jours: Array<{
        date_acces: string;
        total_tentatives: number;
        succes: number;
        echecs: number;
        utilisateurs_uniques: number;
    }>;
    alertes_actives: Array<{
        id: string;
        type_alerte: string;
        titre: string;
        message: string;
        niveau_gravite: string;
        utilisateur_concerne: string | null;
        dispositif_concerne: string | null;
        heures_depuis_creation: number;
    }>;
}

export class StatsRepository {
    async getDashboardStats(): Promise<DashboardStats> {
        const [statsTempsReel, activite30Jours, alertesActives] = await Promise.all([
            query('SELECT * FROM vue_stats_temps_reel'),
            query('SELECT * FROM vue_activite_dashboard'),
            query('SELECT * FROM vue_alertes_actives')
        ]);

        return {
            stats_temps_reel: {
                acces_derniere_heure: statsTempsReel.rows[0].acces_derniere_heure,
                acces_24h: statsTempsReel.rows[0].acces_24h,
                echecs_derniere_heure: statsTempsReel.rows[0].echecs_derniere_heure,
                utilisateurs_actifs_24h: statsTempsReel.rows[0].utilisateurs_actifs_24h
            },
            activite_30_jours: activite30Jours.rows.map(row => ({
                date_acces: row.date_acces,
                total_tentatives: row.total_tentatives,
                succes: row.succes,
                echecs: row.echecs,
                utilisateurs_uniques: row.utilisateurs_uniques
            })),
            alertes_actives: alertesActives.rows.map(row => ({
                id: row.id,
                type_alerte: row.type_alerte,
                titre: row.titre,
                message: row.message,
                niveau_gravite: row.niveau_gravite,
                utilisateur_concerne: row.utilisateur_concerne,
                dispositif_concerne: row.dispositif_concerne,
                heures_depuis_creation: row.heures_depuis_creation
            })),
            
        };
    }
} 