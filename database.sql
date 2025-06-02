-- ==========================================
-- STRUCTURE BASE DE DONNÉES POSTGRESQL
-- Système de Contrôle d'Accès RFID + PIN
-- ==========================================

-- Extension pour UUID (optionnel)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Types ENUM personnalisés
CREATE TYPE statut_utilisateur AS ENUM ('actif', 'inactif', 'suspendu');
CREATE TYPE statut_badge AS ENUM ('actif', 'inactif', 'perdu', 'vole');
CREATE TYPE statut_dispositif AS ENUM ('en_ligne', 'hors_ligne', 'maintenance');
CREATE TYPE type_tentative AS ENUM ('badge_seul', 'pin_seul', 'badge_pin', 'verrou', 'inconnu');
CREATE TYPE resultat_acces AS ENUM (
    'succes', 
    'echec_badge', 
    'echec_pin', 
    'echec_permission', 
    'echec_horaire', 
    'echec_inconnu',
    'echec_utilisateur_verrouille',
    'echec_utilisateur_inactif', 
    'echec_dispositif_introuvable',
    'echec_dispositif_dispositif',
    'echec_dispositif_dispositif',
    'echec_dispositif_hors_ligne',
    'echec_dispositif_erreur',
    'erreur_interne'
    );
CREATE TYPE type_alerte AS ENUM ('tentative_intrusion', 'badge_perdu', 'dispositif_offline', 'echecs_multiples', 'access_refuse');
CREATE TYPE niveau_gravite AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE statut_alerte AS ENUM ('nouvelle', 'vue', 'traitee', 'ignoree');
CREATE TYPE type_dispositif AS ENUM ('client', 'actionneur');
CREATE TYPE type_donnee_config AS ENUM ('string', 'integer', 'boolean', 'json');

-- Table des rôles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    niveau_acces INTEGER NOT NULL DEFAULT 1 CHECK (niveau_acces BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des utilisateurs
CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- Hash sécurisé du PIN
    password_hash VARCHAR(255) NOT NULL, -- Hash sécurisé du mot de passe
    role_id UUID NOT NULL REFERENCES roles(id),
    statut statut_utilisateur DEFAULT 'actif',
    date_expiration DATE,
    tentatives_echec INTEGER DEFAULT 0,
    derniere_tentative TIMESTAMP WITH TIME ZONE,
    verrouille_jusqu TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table utilisateurs
CREATE INDEX idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX idx_utilisateurs_statut ON utilisateurs(statut);
CREATE INDEX idx_utilisateurs_role_id ON utilisateurs(role_id);

-- Table des badges RFID
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid_rfid VARCHAR(50) NOT NULL UNIQUE,
    utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    statut statut_badge DEFAULT 'actif',
    date_assignation TIMESTAMP WITH TIME ZONE,
    date_expiration DATE,
    commentaire TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table badges
CREATE INDEX idx_badges_uid_rfid ON badges(uid_rfid);
CREATE INDEX idx_badges_utilisateur_id ON badges(utilisateur_id);
CREATE INDEX idx_badges_statut ON badges(statut);

-- Table des zones d'accès
CREATE TABLE zones_acces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    niveau_securite INTEGER NOT NULL DEFAULT 1 CHECK (niveau_securite BETWEEN 1 AND 5),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des dispositifs ESP32
CREATE TABLE dispositifs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    ip_address INET,
    zone_acces_id UUID NOT NULL REFERENCES zones_acces(id),
    statut statut_dispositif DEFAULT 'hors_ligne',
    type type_dispositif NOT NULL DEFAULT 'client',
    version_firmware VARCHAR(20),
    derniere_connexion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table dispositifs
CREATE INDEX idx_dispositifs_mac_address ON dispositifs(mac_address);
CREATE INDEX idx_dispositifs_statut ON dispositifs(statut);
CREATE INDEX idx_dispositifs_zone_acces_id ON dispositifs(zone_acces_id);

-- Table des permissions (relation rôles-zones)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    zone_acces_id UUID NOT NULL REFERENCES zones_acces(id) ON DELETE CASCADE,
    heure_debut TIME DEFAULT '00:00:00',
    heure_fin TIME DEFAULT '23:59:59',
    jours_semaine INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Lundi, 7=Dimanche
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_role_zone UNIQUE (role_id, zone_acces_id)
);

-- Table des logs d'accès
CREATE TABLE logs_acces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
    dispositif_id UUID NOT NULL REFERENCES dispositifs(id),
    type_tentative type_tentative NOT NULL,
    resultat resultat_acces NOT NULL,
    uid_rfid_tente VARCHAR(50),
    adresse_ip INET,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table logs_acces (optimisés pour les requêtes fréquentes)
CREATE INDEX idx_logs_acces_timestamp ON logs_acces(timestamp DESC);
CREATE INDEX idx_logs_acces_utilisateur_id ON logs_acces(utilisateur_id);
CREATE INDEX idx_logs_acces_resultat ON logs_acces(resultat);
CREATE INDEX idx_logs_acces_dispositif_id ON logs_acces(dispositif_id);
CREATE INDEX idx_logs_acces_date ON logs_acces(DATE(timestamp));

-- Table des alertes
CREATE TABLE alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_alerte type_alerte NOT NULL,
    titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    niveau_gravite niveau_gravite DEFAULT 'info',
    utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    dispositif_id UUID REFERENCES dispositifs(id) ON DELETE SET NULL,
    log_acces_id UUID REFERENCES logs_acces(id) ON DELETE SET NULL,
    statut statut_alerte DEFAULT 'nouvelle',
    assignee_admin_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_traitement TIMESTAMP WITH TIME ZONE,
    commentaire_traitement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table alertes
CREATE INDEX idx_alertes_type_alerte ON alertes(type_alerte);
CREATE INDEX idx_alertes_statut ON alertes(statut);
CREATE INDEX idx_alertes_niveau_gravite ON alertes(niveau_gravite);
CREATE INDEX idx_alertes_created_at ON alertes(created_at DESC);

-- Table de configuration système
CREATE TABLE configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cle VARCHAR(100) NOT NULL UNIQUE,
    valeur TEXT NOT NULL,
    description TEXT,
    type_donnee type_donnee_config DEFAULT 'string',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des sessions admin (pour le dashboard)
CREATE TABLE sessions_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    adresse_ip INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la table sessions_admin
CREATE INDEX idx_sessions_admin_expires_at ON sessions_admin(expires_at);
CREATE INDEX idx_sessions_admin_utilisateur_id ON sessions_admin(utilisateur_id);

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
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utilisateurs_updated_at BEFORE UPDATE ON utilisateurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_acces_updated_at BEFORE UPDATE ON zones_acces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispositifs_updated_at BEFORE UPDATE ON dispositifs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_updated_at BEFORE UPDATE ON configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Fonction pour générer des alertes automatiques
CREATE OR REPLACE FUNCTION generate_security_alert(
    p_type_alerte type_alerte,
    p_titre VARCHAR(200),
    p_message TEXT,
    p_niveau_gravite niveau_gravite DEFAULT 'warning',
    p_utilisateur_id INTEGER DEFAULT NULL,
    p_dispositif_id INTEGER DEFAULT NULL,
    p_log_acces_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    alert_id INTEGER;
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

-- ==========================================
-- DONNÉES INITIALES
-- ==========================================

-- Insérer les rôles de base
INSERT INTO roles (nom, description, niveau_acces) VALUES
('Super Admin', 'Accès complet au système', 5),
('Admin', 'Administration des utilisateurs et zones', 4),
('Manager', 'Gestion des équipes et accès limité', 3),
('Employé', 'Accès standard aux zones autorisées', 2),
('Visiteur', 'Accès limité et temporaire', 1);

-- Insérer la configuration par défaut
INSERT INTO configuration (cle, valeur, description, type_donnee) VALUES
('max_tentatives_echec', '3', 'Nombre maximum de tentatives échouées avant verrouillage', 'integer'),
('duree_verrouillage_minutes', '15', 'Durée de verrouillage en minutes', 'integer'),
('alerte_echecs_consecutifs', '3', 'Nombre d''échecs consécutifs avant alerte', 'integer'),
('duree_session_admin_heures', '8', 'Durée des sessions admin en heures', 'integer'),
('notification_email_actif', 'true', 'Activer les notifications par email', 'boolean'),
('retention_logs_jours', '90', 'Durée de rétention des logs en jours', 'integer');

-- ==========================================
-- VUES UTILES
-- ==========================================

-- Vue pour les accès utilisateurs complets
CREATE VIEW vue_utilisateurs_complets AS
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
CREATE VIEW vue_activite_dashboard AS
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
CREATE VIEW vue_stats_temps_reel AS
SELECT 
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 hour') as acces_derniere_heure,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as acces_24h,
    COUNT(*) FILTER (WHERE resultat != 'succes' AND timestamp >= NOW() - INTERVAL '1 hour') as echecs_derniere_heure,
    COUNT(DISTINCT utilisateur_id) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as utilisateurs_actifs_24h
FROM logs_acces;

-- Vue pour les alertes actives
CREATE VIEW vue_alertes_actives AS
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
-- FONCTIONS D'ANALYSE
-- ==========================================

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_stats(user_id INTEGER, days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_acces BIGINT,
    acces_reussis BIGINT,
    acces_refuses BIGINT,
    dernier_acces TIMESTAMP WITH TIME ZONE,
    zones_utilisees TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_acces,
        COUNT(*) FILTER (WHERE l.resultat = 'succes') as acces_reussis,
        COUNT(*) FILTER (WHERE l.resultat != 'succes') as acces_refuses,
        MAX(l.timestamp) as dernier_acces,
        ARRAY_AGG(DISTINCT z.nom) FILTER (WHERE l.resultat = 'succes') as zones_utilisees
    FROM logs_acces l
    JOIN dispositifs d ON l.dispositif_id = d.id
    JOIN zones_acces z ON d.zone_acces_id = z.id
    WHERE l.utilisateur_id = user_id 
    AND l.timestamp >= NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;