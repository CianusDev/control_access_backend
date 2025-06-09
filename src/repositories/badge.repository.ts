import { z } from "zod";
import { query } from "../config/database";
import { Badge } from "../models/badge.model";
import { badgeSchema } from "../schemas/badge.schema";
import { hashPassword, hashUIDRFID } from "../utils/utils";

export class BadgeRepository {
    async getBadges(limit = 20, offset = 0, email?: string, niveauAcces?: number): Promise<Badge[]> {
        let sql = `
            SELECT b.*, 
                   u.nom as proprietaire_nom, 
                   u.prenom as proprietaire_prenom,
                   r.niveau_acces as proprietaire_niveau_acces
            FROM badges b
            LEFT JOIN utilisateurs u ON b.utilisateur_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (email) {
            sql += ` AND u.email ILIKE $${paramIndex}`;
            params.push(`%${email}%`);
            paramIndex++;
        }

        if (niveauAcces !== undefined) {
            sql += ` AND r.niveau_acces = $${paramIndex}`;
            params.push(niveauAcces);
            paramIndex++;
        }

        sql += ` ORDER BY b.id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        return result.rows as Badge[];
    }

    async getBadge(id: string): Promise<Badge | null> {
        const result = await query(
            `SELECT b.*, 
                    u.nom as proprietaire_nom, 
                    u.prenom as proprietaire_prenom,
                    r.niveau_acces as proprietaire_niveau_acces
             FROM badges b
             LEFT JOIN utilisateurs u ON b.utilisateur_id = u.id
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE b.id = $1`,
            [id]
        );
        return result.rows[0] as Badge || null;
    }

    async countBadges(email?: string, niveauAcces?: number): Promise<number> {
        let sql = `
            SELECT COUNT(*)
            FROM badges b
            LEFT JOIN utilisateurs u ON b.utilisateur_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (email) {
            sql += ` AND u.email ILIKE $${paramIndex}`;
            params.push(`%${email}%`);
            paramIndex++;
        }

        if (niveauAcces !== undefined) {
            sql += ` AND r.niveau_acces = $${paramIndex}`;
            params.push(niveauAcces);
            paramIndex++;
        }

        const result = await query(sql, params);
        return parseInt(result.rows[0].count);
    }

    async createBadge(payload: z.infer<typeof badgeSchema>): Promise<Badge> {
        const badgeExistsResult = await query(
            `SELECT * FROM badges WHERE uid_rfid = $1`,
            [payload.uid_rfid]
        );

        if (badgeExistsResult.rows[0]) {
            throw new Error("Badge déjà utilisé");
        }

        const result = await query(
            `INSERT INTO badges (uid_rfid, utilisateur_id, statut, date_assignation, date_expiration, commentaire)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [payload.uid_rfid, payload.utilisateur_id, payload.statut, payload.date_assignation, payload.date_expiration, payload.commentaire]
        );
        return result.rows[0] as Badge;
    }

    async updateBadge(id: string, payload: Partial<z.infer<typeof badgeSchema>>): Promise<Badge | null> {
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
        if (fields.length === 0) return null;
        values.push(id);
        const result = await query(
            `UPDATE badges SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Badge;
    }

    async deleteBadge(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM badges WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Badge non trouvé");
        }
    }

    async getBadgeByUidRfid(uid_rfid: string): Promise<Badge | null> {
        const result = await query(
            `SELECT * FROM badges WHERE uid_rfid = $1`,
            [uid_rfid]
        );

        return result.rows[0] as Badge || null;
    }
}