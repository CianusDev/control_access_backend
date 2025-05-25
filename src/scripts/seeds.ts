import { pool } from '../config/database';

async function seedDatabase() {
    try {
        // Insérer les rôles de base
        await pool.query(`
            INSERT INTO roles (nom, description, niveau_acces) VALUES
            ('Super Admin', 'Accès complet au système', 5),
            ('Admin', 'Administration des utilisateurs et zones', 4),
            ('Manager', 'Gestion des équipes et accès limité', 3),
            ('Employé', 'Accès standard aux zones autorisées', 2),
            ('Visiteur', 'Accès limité et temporaire', 1)
            ON CONFLICT (nom) DO NOTHING;
        `);

        // Insérer la configuration par défaut
        await pool.query(`
            INSERT INTO configuration (cle, valeur, description, type_donnee) VALUES
            ('max_tentatives_echec', '3', 'Nombre maximum de tentatives échouées avant verrouillage', 'integer'),
            ('duree_verrouillage_minutes', '15', 'Durée de verrouillage en minutes', 'integer'),
            ('alerte_echecs_consecutifs', '3', 'Nombre d''échecs consécutifs avant alerte', 'integer'),
            ('duree_session_admin_heures', '8', 'Durée des sessions admin en heures', 'integer'),
            ('notification_email_actif', 'true', 'Activer les notifications par email', 'boolean'),
            ('retention_logs_jours', '90', 'Durée de rétention des logs en jours', 'integer')
            ON CONFLICT (cle) DO NOTHING;
        `);

        console.log('🌱 Données initiales insérées avec succès.');

    } catch (error) {
        console.error("❌ Erreur lors de l'insertion des données initiales :", error);
    } finally {
        // pool.end() est géré par le script d'initialisation principal (db_init.ts)
        // await pool.end();
    }
}

// Exporter la fonction pour qu'elle puisse être appelée par d'autres scripts
export { seedDatabase };

// Supprimer l'appel direct si ce script n'est pas censé être exécuté seul
// seedDatabase();
