import { z } from "zod";
import { query } from "../config/database";
import { Alert } from "../models/alert.model";
import { alertSchema } from "../schemas/alert.schema";

export class AlertRepository {

    async getAlerts(limit = 20, offset = 0): Promise<Alert[]> {
        const result = await query(
            `SELECT * FROM alertes ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Alert[];
    }

    async getAlert(id: string): Promise<Alert | null> {
        const result = await query(
            `SELECT * FROM alertes WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Alert || null;
    }

    async createAlert(payload: z.infer<typeof alertSchema>): Promise<Alert> {
        const result = await query(
            `INSERT INTO alertes (type_alerte, titre, message, niveau_gravite, utilisateur_id, dispositif_id, log_acces_id, statut, assignee_admin_id, date_traitement, commentaire_traitement, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [payload.type_alerte, payload.titre, payload.message, payload.niveau_gravite, payload.utilisateur_id, payload.dispositif_id, payload.log_acces_id, payload.statut, payload.assignee_admin_id, payload.date_traitement, payload.commentaire_traitement, payload.created_at]
        );
        return result.rows[0] as Alert;
    }

    async updateAlert(id: string, payload: Partial<z.infer<typeof alertSchema>>): Promise<Alert | null> {
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
            `UPDATE alertes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Alert;
    }

    async deleteAlert(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM alertes WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Alerte non trouvée");
        }
    }

}