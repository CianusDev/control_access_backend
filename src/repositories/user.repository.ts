import { z } from "zod";
import { query } from "../config/database";
import { User, UserStatus } from "../models/user.model";
import { userSchema, userUpdateSchema } from "../schemas/user.schema";
import { hashPassword, comparePassword } from "../utils/utils";

export class UserRepository {

    async createUser(payload: z.infer<typeof userSchema>): Promise<User> {
        const { nom, prenom, email, pin, password, role_id, statut, date_expiration } = payload;

        const pin_hash = await hashPassword(pin!);

        const password_hash = await hashPassword(password)

        const userExistsResult = await query(
            `SELECT * FROM utilisateurs WHERE email = $1`,
            [email]
        );

        if (userExistsResult.rows[0]) {
            throw new Error("Email déjà utilisé");
        }

        const result = await query(
            `INSERT INTO utilisateurs (nom, prenom, email, pin_hash, password_hash, role_id, statut, date_expiration)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [nom, prenom, email, pin_hash, password_hash,  role_id, statut ?? UserStatus.actif, date_expiration]
        );

        return result.rows[0] as User;
    }

    async updateUser(id: string, payload: Partial<z.infer<typeof userUpdateSchema>>): Promise<User | null> {
        const userExistsResult = await query(
            `SELECT * FROM utilisateurs WHERE id = $1`,
            [id]
        );
        if (!userExistsResult.rows[0]) {
            throw new Error("Utilisateur non trouvé");
        }
        // Construction dynamique de la requête d'update
        const fields = [];
        const values = [];
        let idx = 1;
        for (const [key, value] of Object.entries(payload)) {
            if (value !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }
        
        if (fields.length === 0) return userExistsResult.rows[0] as User;
        values.push(id);
        const result = await query(
            `UPDATE utilisateurs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as User;
    }

    async deleteUser(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM utilisateurs WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Utilisateur non trouvé");
        }
    }

    async getUser(id: string): Promise<User | null> {
        const result = await query(
            `SELECT * FROM utilisateurs WHERE id = $1`,
            [id]
        );
        return result.rows[0] as User || null;
    }

    async getUsers(limit = 20, offset = 0): Promise<User[]> {
        const result = await query(
            `SELECT * FROM utilisateurs ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as User[];
    }

    async getUserByPin(pin: string): Promise<User | null> {
        const pin_hash = await hashPassword(pin)
        const result = await query(
            `SELECT * FROM utilisateurs WHERE pin_hash = $1`,
            [pin_hash]
        );
        return result.rows[0] as User || null;
    }
    async incrementFailedAttempts(userId: string): Promise<void> {
        const result = await query(
            `UPDATE utilisateurs 
             SET tentatives_echec = tentatives_echec + 1,
                derniere_tentative = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [userId]
        );
        if (result.rowCount === 0) {
            throw new Error("Utilisateur non trouvé");
        }
    }

    async resetFailedAttempts(userId: string): Promise<void> {
        const result = await query(
            `UPDATE utilisateurs 
             SET tentatives_echec = 0,
                derniere_tentative = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [userId]
        );
        if (result.rowCount === 0) {
            throw new Error("Utilisateur non trouvé");
        }
    }

    // Méthode pour verrouiller un utilisateur (NOUVEAU)
    async lockUser(userId: string, lockUntil: Date): Promise<void> {
        const result = await query(
            `UPDATE utilisateurs
             SET verrouille_jusqu = $1
             WHERE id = $2`,
            [lockUntil, userId]
        );
         if (result.rowCount === 0) {
            throw new Error("Utilisateur non trouvé");
         }
    }

    async getUserByPinHash(pinHash: string): Promise<User | null> {
         const result = await query(
            `SELECT * FROM utilisateurs WHERE pin_hash = $1`,
            [pinHash]
         );
         return result.rows[0] as User || null;
    }

    async getUserByEmail(email: string): Promise<User | null> {
         const result = await query(
            `SELECT * FROM utilisateurs WHERE email = $1`,
            [email]
         );
         return result.rows[0] as User || null;
    }
}
