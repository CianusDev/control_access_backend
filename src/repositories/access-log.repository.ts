import { z } from "zod";
import { query } from "../config/database";
import { AccessLog } from "../models/access-log.model";
import { accessLogSchema } from "../schemas/access-log.schema";


export class AccessLogRepository {

    async getAccessLogs(): Promise<AccessLog[]|null> {
        const result = await query(
            `SELECT * FROM access_logs`
        );

        return result.rows as AccessLog[];
    }

    async getAccessLog(id: string): Promise<AccessLog|null> {
        const result = await query(
            `SELECT * FROM access_logs WHERE id = $1`,
            [id]
        );

        return result.rows[0] as AccessLog;
    }

    async createAccessLog(payload: z.infer<typeof accessLogSchema>): Promise<AccessLog|null> {
        const result = await query( 
            `INSERT INTO access_logs (badge_uid, device_id, access_status) VALUES ($1, $2, $3) RETURNING *`,
            [payload.badge_uid, payload.device_id, payload.access_status]
        );

        return result.rows[0] as AccessLog;
    }

    async updateAccessLog(id: string, payload: z.infer<typeof accessLogSchema>): Promise<AccessLog|null> {
        const result = await query(
            `UPDATE access_logs SET badge_uid = $1, device_id = $2, access_status = $3 WHERE id = $4`,
            [payload.badge_uid, payload.device_id, payload.access_status, id]
        );  
        return result.rows[0] as AccessLog;
    }

    async deleteAccessLog(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM access_logs WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("AccessLog not found");
        }
    }
}