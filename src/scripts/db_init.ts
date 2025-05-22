import { pool } from '../config/database';
async function setupDatase() {
    try {

        // Suppression des tables existantes (ordre inverse à cause des contraintes)
        await pool.query(`
            DROP TABLE IF EXISTS access_logs;
            DROP TABLE IF EXISTS badges;
            DROP TABLE IF EXISTS devices;
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS roles;
        `);

        const createTableQuery = `
        -- Table des rôles
            CREATE TABLE IF NOT EXISTS roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) UNIQUE NOT NULL
        );

      -- Table des utilisateurs
        CREATE TABLE IF NOT EXISTS "users" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hashed VARCHAR(255) NOT NULL,
            username VARCHAR(100),
            firstname VARCHAR(100),
            lastname VARCHAR(100),
            role_id UUID REFERENCES roles(id),
            is_active BOOLEAN DEFAULT true,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

       -- Table des badges
        CREATE TABLE IF NOT EXISTS badges (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uid VARCHAR(255) UNIQUE,
            user_id UUID REFERENCES users(id),
            actif BOOLEAN DEFAULT true,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

      -- Table des appareils ESP32 (avec type d'accès)
        CREATE TABLE IF NOT EXISTS devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(100),
            chip_id VARCHAR(100) UNIQUE,
            ip_locale VARCHAR(50),
            localisation TEXT,
            is_deleted BOOLEAN DEFAULT false,
            access_level VARCHAR(50) DEFAULT 'all' -- admin-only, user-only, all , security-only
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

      -- Table des logs d'accès
        CREATE TABLE IF NOT EXISTS access_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            badge_uid VARCHAR(255),
            device_id UUID REFERENCES devices(id),
            access_status VARCHAR(20),
            is_deleted BOOLEAN DEFAULT false,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE alerts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id),
            device_id UUID REFERENCES devices(id),
            message TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT false,
            level TEXT CHECK (level IN ('info', 'warning', 'critical')) DEFAULT 'info',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        `;

        await pool.query(createTableQuery);

        await pool.query(`
            INSERT INTO roles (name) VALUES 
                ('root'),
                ('admin'), 
                ('security'), 
                ('user')
            ON CONFLICT (name) DO NOTHING;
        `);

        console.log('📦 Base de données initialisée avec succès.');
    } catch (error) {
        console.error('❌ Erreur de création de la base :', error);
    } finally {
        await pool.end();
    }
}

setupDatase();
