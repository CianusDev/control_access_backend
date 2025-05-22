import { z } from "zod";
import { query } from "../config/database";
import { Alert } from "../models/alert.model";
import { alertSchema } from "../schemas/alert.schema";

export class AlertRepository {

    async getAlerts(): Promise<Alert[]|null> {
        const result = await query(
            `SELECT * FROM alerts`
        );

        return result.rows as Alert[];
    }

    async getAlert(id: string): Promise<Alert|null> {
        const result = await query(
            `SELECT * FROM alerts WHERE id = $1`,
            [id]
        );

        return result.rows[0] as Alert;
    }

    async createAlert(payload: z.infer<typeof alertSchema>): Promise<Alert|null> {
        const result = await query( 
            `INSERT INTO alerts (user_id, device_id, message) VALUES ($1, $2, $3) RETURNING *`,
            [payload.user_id, payload.device_id, payload.message]
        );

        return result.rows[0] as Alert;
    }

    async deleteAlert(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM alerts WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Alert not found");
        }
    }

    async updateDeletedAlert(id: string): Promise<void> {
        const alertExistsResult = await query(
            `SELECT * FROM alerts WHERE id = $1`,
            [id]
        );

        const existingAlert = alertExistsResult.rows[0] as Alert;

        if (!existingAlert) {
            throw new Error("Alert not found");
        }
        
        const result = await query(
            `UPDATE alerts SET is_deleted = true WHERE user_id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Alert not found");
        }
    }

}