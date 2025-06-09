import { z } from "zod";
import { query } from "../config/database";
import { ZoneAcces } from "../models/zones-acces.model";
import { zoneAccesSchema } from "../schemas/zones-acces.schema";

export class ZoneAccesRepository {
    async getZones(limit = 20, offset = 0): Promise<ZoneAcces[]> {
        const result = await query(
            `SELECT * FROM zones_acces ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as ZoneAcces[];
    }

    async getZone(id: string): Promise<ZoneAcces | null> {
        const result = await query(
            `SELECT * FROM zones_acces WHERE id = $1`,
            [id]
        );
        return result.rows[0] as ZoneAcces || null;
    }

    async countZones(): Promise<number> {
        const result = await query(
            `SELECT COUNT(*) FROM zones_acces`
        );
        return parseInt(result.rows[0].count);
    }

    async createZone(payload: z.infer<typeof zoneAccesSchema>): Promise<ZoneAcces> {
        const result = await query(
            `INSERT INTO zones_acces (nom, description, niveau_securite, actif) VALUES ($1, $2, $3, $4) RETURNING *`,
            [payload.nom, payload.description, payload.niveau_securite, payload.actif]
        );
        return result.rows[0] as ZoneAcces;
    }

    async updateZone(id: string, payload: Partial<z.infer<typeof zoneAccesSchema>>): Promise<ZoneAcces | null> {
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
            `UPDATE zones_acces SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as ZoneAcces;
    }

    async deleteZone(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM zones_acces WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Zone d'accès non trouvée");
        }
    }
} 