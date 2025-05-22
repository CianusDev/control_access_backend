import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { hashPassword } from '../utils/utils';

const adminData = {
  username: 'superadmin',
  email: 'root@example.com',
  password: 'admin1234', // À remplacer par un mot de passe sécurisé
  firstname: 'Root',
  lastname: 'User',
};

async function createRootAdmin() {
  try {
    // Vérifie si un root existe déjà
    const existing = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [adminData.email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      console.log('ℹ️ Le compte root existe déjà.');
      return;
    }

    // Récupère le rôle root
    const roleResult = await pool.query(`SELECT * FROM roles WHERE name = 'root' LIMIT 1`);
    if (roleResult.rowCount === 0) {
      throw new Error("Le rôle 'root' n'existe pas.");
    }

    const roleId = roleResult.rows[0].id;
    const hashedPassword = await hashPassword(adminData.password)
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, username, password_hashed, email, firstname, lastname, role_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        userId,
        adminData.username,
        hashedPassword,
        adminData.email,
        adminData.firstname,
        adminData.lastname,
        roleId,
      ]
    );

    console.log('✅ Compte root créé avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte root :', error);
  } finally {
    await pool.end();
  }
}

createRootAdmin();
