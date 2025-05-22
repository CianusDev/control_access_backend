import { z } from "zod";
import { query } from "../config/database";
import { Badge } from "../models/badge.model";
import { badgeSchema } from "../schemas/badge.schema";


export class BadgeRepository {

    async getBadges(): Promise<Badge[]|null> {
        const result = await query(
            `SELECT * FROM badges`
        );

        return result.rows as Badge[];
    }

    async getBadge(id: string): Promise<Badge|null> {
        const result = await query(
            `SELECT * FROM badges WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) return null;

        return result.rows[0] as Badge;
    }

    async createBadge(payload: z.infer<typeof badgeSchema>): Promise<Badge|null> {

        const badgeExistsResult = await query(
            `SELECT * FROM badges WHERE uid = $1`,
            [payload.uid]
        );

        const existingBadge = badgeExistsResult.rows[0];

        if (existingBadge) {
            const errorMessages: Record<string, string> = {};
            if (existingBadge.uid === payload.uid) errorMessages.uid = "Badge déjà utilisé";
            throw new Error(JSON.stringify(errorMessages));
        }
        
        const result = await query(
            `INSERT INTO badges (uid, user_id, actif) VALUES ($1, $2, $3) RETURNING *`,
            [payload.uid, payload.user_id, payload.actif]
        );

        return result.rows[0] as Badge;
    }

    async updateBadge(id: string, payload: z.infer<typeof badgeSchema>): Promise<Badge|null> {
        const result = await query(
            `UPDATE badges SET uid = $1, user_id = $2, actif = $3 WHERE id = $4 RETURNING *`,
            [payload.uid, payload.user_id, payload.actif, id]
        );

        return result.rows[0] as Badge;
    }

    async deleteBadge(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM badges WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Badge not found");
        }
    }

    async updateDeletedBadge(id: string): Promise<void> {
        const badgeExistsResult = await query(
            `SELECT * FROM badges WHERE id = $1`,
            [id]
        );

        const existingBadge = badgeExistsResult.rows[0] as Badge;

        if (!existingBadge) {
            throw new Error("Badge not found");
        }
        
        const result = await query(
            `UPDATE badges SET is_deleted = true WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Badge not found");
        }
    }
}