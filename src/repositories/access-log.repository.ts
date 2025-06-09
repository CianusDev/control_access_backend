import { z } from "zod";
import { query } from "../config/database";
import { AccessLog } from "../models/access-log.model";
import { accessLogSchema } from "../schemas/access-log.schema";

export class AccessLogRepository {
    async getAccessLogs(limit = 20, offset = 0): Promise<AccessLog[]> {
        const result = await query(
            `SELECT * FROM logs_acces ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as AccessLog[];
    }

    async getAccessLog(id: string): Promise<AccessLog | null> {
        const result = await query(
            `SELECT * FROM logs_acces WHERE id = $1`,
            [id]
        );
        return result.rows[0] as AccessLog || null;
    }

    async countAccessLogs(): Promise<number> {
        const result = await query(
            `SELECT COUNT(*) FROM logs_acces`
        );
        return parseInt(result.rows[0].count);
    }

    async createAccessLog(payload: z.infer<typeof accessLogSchema>): Promise<AccessLog> {
        const result = await query(
            `INSERT INTO logs_acces (utilisateur_id, badge_id, dispositif_id, type_tentative, resultat, uid_rfid_tente, adresse_ip, details, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [payload.utilisateur_id, payload.badge_id, payload.dispositif_id, payload.type_tentative, payload.resultat, payload.uid_rfid_tente, payload.adresse_ip, payload.details, payload.timestamp]
        );
        return result.rows[0] as AccessLog;
    }

    async updateAccessLog(id: string, payload: Partial<z.infer<typeof accessLogSchema>>): Promise<AccessLog | null> {
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
            `UPDATE logs_acces SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as AccessLog;
    }

    async deleteAccessLog(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM logs_acces WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Log d'accès non trouvé");
        }
    }
}