import { pool } from '../config/database';

async function setupDatabaseExtras() {
    try {
        console.log('⏳ Application des index, vues, fonctions et triggers...');

        const extrasQuery = `
-- ==========================================
-- Extension pour UUID
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Types ENUM personnalisés
-- ==========================================
-- Ces types doivent être créés avant la création des tables qui les utilisent.
-- Si db_init.ts est exécuté avant, ils pourraient déjà exister.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_utilisateur') THEN
        CREATE TYPE statut_utilisateur AS ENUM ('actif', 'inactif', 'suspendu');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_badge') THEN
        CREATE TYPE statut_badge AS ENUM ('actif', 'inactif', 'perdu', 'vole');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_dispositif') THEN
        CREATE TYPE statut_dispositif AS ENUM ('en_ligne', 'hors_ligne', 'maintenance');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_tentative') THEN
        CREATE TYPE type_tentative AS ENUM ('badge_seul', 'pin_seul', 'badge_pin', 'inconnu');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resultat_acces') THEN
        CREATE TYPE resultat_acces AS ENUM ('succes', 'echec_badge', 'echec_pin', 'echec_permission', 'echec_horaire');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_alerte') THEN
        CREATE TYPE type_alerte AS ENUM ('tentative_intrusion', 'badge_perdu', 'dispositif_offline', 'echecs_multiples', 'access_refuse');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'niveau_gravite') THEN
        CREATE TYPE niveau_gravite AS ENUM ('info', 'warning', 'error', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_alerte') THEN
        CREATE TYPE statut_alerte AS ENUM ('nouvelle', 'vue', 'traitee', 'ignoree');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_donnee_config') THEN
        CREATE TYPE type_donnee_config AS ENUM ('string', 'integer', 'boolean', 'json');
    END IF;
END
$$;

-- ==========================================
-- INDEXES
-- ==========================================

-- Index pour la table utilisateurs
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_statut ON utilisateurs(statut);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_role_id ON utilisateurs(role_id);

-- Index pour la table badges
CREATE INDEX IF NOT EXISTS idx_badges_uid_rfid ON badges(uid_rfid);
CREATE INDEX IF NOT EXISTS idx_badges_utilisateur_id ON badges(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_badges_statut ON badges(statut);

-- Index pour la table dispositifs
CREATE INDEX IF NOT EXISTS idx_dispositifs_mac_address ON dispositifs(mac_address);
CREATE INDEX IF NOT EXISTS idx_dispositifs_statut ON dispositifs(statut);
CREATE INDEX IF NOT EXISTS idx_dispositifs_zone_acces_id ON dispositifs(zone_acces_id);

-- Index pour la table logs_acces (optimisés pour les requêtes fréquentes)
CREATE INDEX IF NOT EXISTS idx_logs_acces_timestamp ON logs_acces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acces_utilisateur_id ON logs_acces(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_logs_acces_resultat ON logs_acces(resultat);
CREATE INDEX IF NOT EXISTS idx_logs_acces_dispositif_id ON logs_acces(dispositif_id);
-- CREATE INDEX IF NOT EXISTS idx_logs_acces_date ON logs_acces((timestamp::date)); -- Commenté pour éviter l'erreur IMMUTABLE

-- Index pour la table alertes
CREATE INDEX IF NOT EXISTS idx_alertes_type_alerte ON alertes(type_alerte);
CREATE INDEX IF NOT EXISTS idx_alertes_statut ON alertes(statut);
CREATE INDEX IF NOT EXISTS idx_alertes_niveau_gravite ON alertes(niveau_gravite);
CREATE INDEX IF NOT EXISTS idx_alertes_created_at ON alertes(created_at DESC);

-- Index pour la table sessions_admin
CREATE INDEX IF NOT EXISTS idx_sessions_admin_expires_at ON sessions_admin(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_utilisateur_id ON sessions_admin(utilisateur_id);

-- ==========================================
-- VUES
-- ==========================================

-- Vue pour les accès utilisateurs complets
CREATE OR REPLACE VIEW vue_utilisateurs_complets AS
SELECT 
    u.id,
    u.nom,
    u.prenom,
    u.email,
    r.nom as role_nom,
    r.niveau_acces,
    u.statut,
    u.date_expiration,
    b.uid_rfid,
    b.statut as badge_statut,
    u.tentatives_echec,
    u.verrouille_jusqu,
    u.created_at
FROM utilisateurs u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN badges b ON b.utilisateur_id = u.id;

-- Vue pour le dashboard d'activité
CREATE OR REPLACE VIEW vue_activite_dashboard AS
SELECT 
    DATE(timestamp) as date_acces,
    COUNT(*) as total_tentatives,
    COUNT(*) FILTER (WHERE resultat = 'succes') as succes,
    COUNT(*) FILTER (WHERE resultat != 'succes') as echecs,
    COUNT(DISTINCT utilisateur_id) as utilisateurs_uniques
FROM logs_acces 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date_acces DESC;

-- Vue pour les statistiques en temps réel
CREATE OR REPLACE VIEW vue_stats_temps_reel AS
SELECT 
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 hour') as acces_derniere_heure,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as acces_24h,
    COUNT(*) FILTER (WHERE resultat != 'succes' AND timestamp >= NOW() - INTERVAL '1 hour') as echecs_derniere_heure,
    COUNT(DISTINCT utilisateur_id) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as utilisateurs_actifs_24h
FROM logs_acces;

-- Vue pour les alertes actives
CREATE OR REPLACE VIEW vue_alertes_actives AS
SELECT 
    a.*,
    u.nom || ' ' || u.prenom as utilisateur_concerne,
    d.nom as dispositif_concerne,
    EXTRACT(EPOCH FROM (NOW() - a.created_at))/3600 as heures_depuis_creation
FROM alertes a
LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
LEFT JOIN dispositifs d ON a.dispositif_id = d.id
WHERE a.statut IN ('nouvelle', 'vue')
ORDER BY a.niveau_gravite DESC, a.created_at DESC;

-- ==========================================
-- FONCTIONS ET TRIGGERS
-- ==========================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_roles_updated_at') THEN
        CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_utilisateurs_updated_at') THEN
        CREATE TRIGGER update_utilisateurs_updated_at BEFORE UPDATE ON utilisateurs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_badges_updated_at') THEN
        CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_zones_acces_updated_at') THEN
        CREATE TRIGGER update_zones_acces_updated_at BEFORE UPDATE ON zones_acces
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dispositifs_updated_at') THEN
        CREATE TRIGGER update_dispositifs_updated_at BEFORE UPDATE ON dispositifs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_configuration_updated_at') THEN
        CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions_admin WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer des alertes automatiques (UUIDs pour les IDs)
CREATE OR REPLACE FUNCTION generate_security_alert(
    p_type_alerte type_alerte,
    p_titre VARCHAR(200),
    p_message TEXT,
    p_niveau_gravite niveau_gravite DEFAULT 'warning',
    p_utilisateur_id UUID DEFAULT NULL,
    p_dispositif_id UUID DEFAULT NULL,
    p_log_acces_id UUID DEFAULT NULL
)
RETURNS UUID AS $$ -- Retourne l'UUID de l'alerte créée
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO alertes (
        type_alerte, titre, message, niveau_gravite, 
        utilisateur_id, dispositif_id, log_acces_id
    ) VALUES (
        p_type_alerte, p_titre, p_message, p_niveau_gravite,
        p_utilisateur_id, p_dispositif_id, p_log_acces_id
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Note: La fonction get_user_stats n'est pas incluse ici car elle utilise des types INTEGER pour les IDs.
-- Elle devra être adaptée pour utiliser des UUIDs si nécessaire, ou gérée côté application.
        `;

        await pool.query(extrasQuery);

        console.log('✨ Index, vues, fonctions et triggers appliqués avec succès.');

    } catch (error) {
        console.error('❌ Erreur lors de l\'application des extras de base de données :', error);
        throw error; // Rethrow the error to signal failure
    }
}

// Exporter la fonction pour pouvoir l'appeler depuis db_init.ts si désiré,
// ou l'exécuter séparément.
export { setupDatabaseExtras };

// Pour l'exécution autonome (par exemple, via npm run script)
// setupDatabaseExtras(); 