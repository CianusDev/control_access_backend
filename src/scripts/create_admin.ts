import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { hashPassword } from '../utils/utils';
import { UserStatus } from '../models/user.model';

const adminData = {
  nom: 'User',
  prenom: 'Root',
  email: 'root@example.com',
  password: 'admin1234', // À remplacer par un mot de passe sécurisé
};

async function createRootAdmin() {
  try {
    // Vérifie si un super admin existe déjà par email
    const existing = await pool.query(
      `SELECT * FROM utilisateurs WHERE email = $1`,
      [adminData.email]
    );
    
    if ((existing.rowCount ?? 0) > 0) {
      console.log('ℹ️ Le compte Super Admin existe déjà.');
      return;
    }

    // Récupère le rôle Super Admin par nom
    const roleResult = await pool.query(`SELECT id FROM roles WHERE nom = 'Super Admin' LIMIT 1`);
    if (roleResult.rowCount === 0) {
      console.error("Le rôle 'Super Admin' n'existe pas. Veuillez exécuter le script seeds.ts d'abord.");
      return;
    }

    const roleId: string = roleResult.rows[0].id;
    const hashedPassword = await hashPassword(adminData.password);
    const userId: string = uuidv4();

    await pool.query(
      `INSERT INTO utilisateurs (id, nom, prenom, email, password_hash, role_id, statut, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        userId,
        adminData.nom,
        adminData.prenom,
        adminData.email,
        hashedPassword,
        roleId,
        UserStatus.actif,
      ]
    );

    console.log('✅ Compte Super Admin créé avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte Super Admin :', error);
  } finally {
    // pool.end() est géré par le script d'initialisation principal (db_init.ts)
    // await pool.end();
  }
}

// Exporter la fonction pour qu'elle puisse être appelée par d'autres scripts
export { createRootAdmin };

// Supprimer l'appel direct si ce script n'est pas censé être exécuté seul
// createRootAdmin();
