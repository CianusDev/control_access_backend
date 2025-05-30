import { pool } from '../config/database';
import { setupDatabaseExtras } from './db_extras';
import { seedDatabase } from './seeds'; // Supposons que seeds.ts exporte seedDatabase
import { createRootAdmin } from './create_admin'; // Supposons que create_admin.ts exporte createRootAdmin

// Renommer et adapter la fonction de création des tables
async function setupDatabaseTables() {
    try {
        console.log('⏳ Création de la structure des tables...');

        // Suppression des tables existantes (ordre inverse à cause des contraintes)
        await pool.query(`
            DROP TABLE IF EXISTS sessions_admin CASCADE;
            DROP TABLE IF EXISTS alertes CASCADE;
            DROP TABLE IF EXISTS logs_acces CASCADE;
            DROP TABLE IF EXISTS permissions CASCADE;
            DROP TABLE IF EXISTS dispositifs CASCADE;
            DROP TABLE IF EXISTS zones_acces CASCADE;
            DROP TABLE IF EXISTS badges CASCADE;
            DROP TABLE IF EXISTS utilisateurs CASCADE;
            DROP TABLE IF EXISTS configuration CASCADE;
            DROP TABLE IF EXISTS roles CASCADE;
            
        `);

        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        console.log('✅ Extension uuid-ossp créée (si nécessaire).');

        // ==========================================

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_utilisateur') THEN
                CREATE TYPE statut_utilisateur AS ENUM ('actif', 'inactif', 'suspendu');
            END IF;
        END
        $$;`);
                console.log('✅ Type ENUM statut_utilisateur créé (si nécessaire).');

                await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_badge') THEN
                CREATE TYPE statut_badge AS ENUM ('actif', 'inactif', 'perdu', 'vole');
            END IF;
        END
        $$;`);
                console.log('✅ Type ENUM statut_badge créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_dispositif') THEN
                CREATE TYPE statut_dispositif AS ENUM ('en_ligne', 'hors_ligne', 'maintenance');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM statut_dispositif créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_tentative') THEN
                CREATE TYPE type_tentative AS ENUM ('badge_seul', 'pin_seul', 'badge_pin', 'inconnu');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM type_tentative créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resultat_acces') THEN
                CREATE TYPE resultat_acces AS ENUM ('succes', 'echec_badge', 'echec_pin', 'echec_permission', 'echec_horaire', 'echec_utilisateur_inactif', 'echec_inconnu','echec_utilisateur_verrouille');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM resultat_acces créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_alerte') THEN
                CREATE TYPE type_alerte AS ENUM ('tentative_intrusion', 'badge_perdu', 'dispositif_offline', 'echecs_multiples', 'access_refuse');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM type_alerte créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'niveau_gravite') THEN
                CREATE TYPE niveau_gravite AS ENUM ('info', 'warning', 'error', 'critical');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM niveau_gravite créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_alerte') THEN
                CREATE TYPE statut_alerte AS ENUM ('nouvelle', 'vue', 'traitee', 'ignoree');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM statut_alerte créé (si nécessaire).');

        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_donnee_config') THEN
                CREATE TYPE type_donnee_config AS ENUM ('string', 'integer', 'boolean', 'json');
            END IF;
        END
        $$;`);
        
        console.log('✅ Type ENUM type_donnee_config créé (si nécessaire).');

        // Ajout du type ENUM pour le type de dispositif
        await pool.query(`DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_dispositif') THEN
                CREATE TYPE type_dispositif AS ENUM ('client', 'actionneur');
            END IF;
        END
        $$;`);
        console.log('✅ Type ENUM type_dispositif créé (si nécessaire).');

        const createTableQuery = `
        -- Table des rôles
        CREATE TABLE IF NOT EXISTS roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            niveau_acces INTEGER NOT NULL DEFAULT 1 CHECK (niveau_acces BETWEEN 1 AND 5),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des utilisateurs
        CREATE TABLE IF NOT EXISTS utilisateurs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            pin_hash VARCHAR(255), -- Hash sécurisé du PIN (peut être NULL si non utilisé pour dashboard)
            password_hash VARCHAR(255), -- Hash sécurisé du mot de passe (peut être NULL si pas admin)
            role_id UUID NOT NULL REFERENCES roles(id),
            statut statut_utilisateur DEFAULT 'actif',
            date_expiration DATE,
            tentatives_echec INTEGER DEFAULT 0,
            derniere_tentative TIMESTAMP WITH TIME ZONE,
            verrouille_jusqu TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des zones d'accès
        CREATE TABLE IF NOT EXISTS zones_acces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(100) NOT NULL,
            description TEXT,
            niveau_securite INTEGER NOT NULL DEFAULT 1 CHECK (niveau_securite BETWEEN 1 AND 5),
            actif BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des badges RFID
        CREATE TABLE IF NOT EXISTS badges (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uid_rfid VARCHAR(255) NOT NULL UNIQUE,
            utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
            statut statut_badge DEFAULT 'actif',
            date_assignation TIMESTAMP WITH TIME ZONE,
            date_expiration DATE,
            commentaire TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des dispositifs ESP32
        CREATE TABLE IF NOT EXISTS dispositifs (
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

        -- Table des permissions (relation rôles-zones)
        CREATE TABLE IF NOT EXISTS permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            zone_acces_id UUID NOT NULL REFERENCES zones_acces(id) ON DELETE CASCADE,
            heure_debut TIME DEFAULT '00:00:00',
            heure_fin TIME DEFAULT '23:59:59',
            jours_semaine INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Lundi, 7=Dimanche
            actif BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

            CONSTRAINT unique_role_zone UNIQUE (role_id, zone_acces_id)
        );

        -- Table des logs d'accès
        CREATE TABLE IF NOT EXISTS logs_acces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
            badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
            dispositif_id VARCHAR(255) NOT NULL REFERENCES dispositifs(id),
            type_tentative type_tentative NOT NULL,
            resultat resultat_acces NOT NULL,
            uid_rfid_tente VARCHAR(50),
            adresse_ip INET,
            details JSONB,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des alertes
        CREATE TABLE IF NOT EXISTS alertes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type_alerte type_alerte NOT NULL,
            titre VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            niveau_gravite niveau_gravite DEFAULT 'info',
            utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
            dispositif_id VARCHAR(255) REFERENCES dispositifs(id) ON DELETE SET NULL,
            log_acces_id UUID REFERENCES logs_acces(id) ON DELETE SET NULL,
            statut statut_alerte DEFAULT 'nouvelle',
            assignee_admin_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
            date_traitement TIMESTAMP WITH TIME ZONE,
            commentaire_traitement TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table de configuration système
        CREATE TABLE IF NOT EXISTS configuration (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cle VARCHAR(100) NOT NULL UNIQUE,
            valeur TEXT NOT NULL,
            description TEXT,
            type_donnee type_donnee_config DEFAULT 'string',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Table des sessions admin (pour le dashboard)
        CREATE TABLE IF NOT EXISTS sessions_admin (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
            adresse_ip INET,
            user_agent TEXT,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        `;

        await pool.query(createTableQuery);

        console.log('📦 Structure des tables créée avec succès.');

    } catch (error) {
        console.error('❌ Erreur lors de la création de la structure des tables :', error);
        throw error; // Rethrow the error
    }
}

// Fonction principale d'initialisation de la base de données
async function initializeDatabase() {
    try {
        console.log('🚀 Début de l\'initialisation complète de la base de données...');

        // 1. Création des tables
        await setupDatabaseTables();

        // 2. Création des index, vues, fonctions et triggers
        // Assurez-vous que setupDatabaseExtras gère la création des ENUMs et de l'extension UUID si nécessaire.
        await setupDatabaseExtras();

        // 3. Insertion des données initiales (rôles, configuration)
        await seedDatabase();

        // 4. Création de l'administrateur initial
        await createRootAdmin();

        console.log('🎉 Base de données initialisée avec succès.');

    } catch (error) {
        console.error('❌ Une erreur est survenue lors de l\'initialisation de la base de données :', error);
        process.exit(1); // Quitter avec un code d'erreur
    } finally {
        // Fermer le pool de connexions à la fin
        await pool.end();
    }
}

// Exécuter la fonction principale
initializeDatabase();
