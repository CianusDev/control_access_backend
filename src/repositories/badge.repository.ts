import { z } from "zod";
import { query } from "../config/database";
import { Badge } from "../models/badge.model";
import { badgeSchema } from "../schemas/badge.schema";
import { hashPassword, hashUIDRFID } from "../utils/utils";

export class BadgeRepository {
    async getBadges(limit = 20, offset = 0): Promise<Badge[]> {
        const result = await query(
            `SELECT * FROM badges ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Badge[];
    }

    async getBadge(id: string): Promise<Badge | null> {
        const result = await query(
            `SELECT * FROM badges WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Badge || null;
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