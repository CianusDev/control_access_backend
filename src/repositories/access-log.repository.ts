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

    async getUserInfoByBadgeUid(badge_uid: string): Promise<any> {
        const result = await query(
            `SELECT * FROM users WHERE id = (SELECT user_id FROM badges WHERE uid = $1)`,
            [badge_uid]
        );
        return result.rows[0];
    }

    async updateDeletedAccessLog(id: string): Promise<void> {
        const accessLogExistsResult = await query(
            `SELECT * FROM access_logs WHERE id = $1`,
            [id]
        );

        const existingAccessLog = accessLogExistsResult.rows[0] as AccessLog;

        if (!existingAccessLog) {
            throw new Error("AccessLog not found");
        }
        
        const result = await query(
            `UPDATE access_logs SET is_deleted = true WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("AccessLog not found");
        }
    }
}