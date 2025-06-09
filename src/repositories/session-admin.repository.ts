import { z } from "zod";
import { query } from "../config/database";
import { SessionAdmin } from "../models/session-admin.model";

export class SessionAdminRepository {
    async getSessions(limit = 20, offset = 0): Promise<SessionAdmin[]> {
        const result = await query(
            `SELECT * FROM sessions_admin ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as SessionAdmin[];
    }

    async getSession(id: string): Promise<SessionAdmin | null> {
        const result = await query(
            `SELECT * FROM sessions_admin WHERE id = $1`,
            [id]
        );
        return result.rows[0] as SessionAdmin || null;
    }

    async countSessions(): Promise<number> {
        const result = await query(
            `SELECT COUNT(*) FROM sessions_admin`
        );
        return parseInt(result.rows[0].count);
    }

    async createSession(payload: Partial<SessionAdmin>): Promise<SessionAdmin> {
        const created_at = new Date();
        const expires_at = new Date(created_at.getTime() + 12 * 60 * 60 * 1000);

        const result = await query(
            `INSERT INTO sessions_admin (utilisateur_id, adresse_ip, user_agent, expires_at, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [payload.utilisateur_id, payload.adresse_ip, payload.user_agent, expires_at, created_at]
        );
        return result.rows[0] as SessionAdmin;
    }

    async updateSession(id: string, payload: Partial<SessionAdmin>): Promise<SessionAdmin | null> {
        const fields = [];
        const values = [];
        let idx = 1;
        const allowedFields = ['utilisateur_id', 'adresse_ip', 'user_agent'];
        for (const [key, value] of Object.entries(payload)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(value);
                idx++;
            }
        }
        if (fields.length === 0) return null;
        values.push(id);
        const result = await query(
            `UPDATE sessions_admin SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as SessionAdmin;
    }

    async deleteSession(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM sessions_admin WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Session admin non trouvée");
        }
    }

    async getSessionByUserId(userId: string): Promise<SessionAdmin | null> {
        const result = await query(
            `SELECT * FROM sessions_admin WHERE utilisateur_id = $1`,
            [userId]
        );
        return result.rows[0] as SessionAdmin || null;
    }
} 