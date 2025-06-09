import { z } from "zod";
import { query } from "../config/database";
import { Configuration } from "../models/configuration.model";
import { configurationSchema } from "../schemas/configuration.schema";

export class ConfigurationRepository {
    async getConfigurations(limit = 20, offset = 0): Promise<Configuration[]> {
        const result = await query(
            `SELECT * FROM configuration ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Configuration[];
    }

    async getConfiguration(id: string): Promise<Configuration | null> {
        const result = await query(
            `SELECT * FROM configuration WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Configuration || null;
    }

    async getConfigurationByKey(key: string): Promise<Configuration | null> {
        const result = await query(
            `SELECT * FROM configuration WHERE cle = $1`,
            [key]
        );
        return result.rows[0] as Configuration || null;
    }

    async countConfigurations(): Promise<number> {
        const result = await query(
            `SELECT COUNT(*) FROM configuration`
        );
        return parseInt(result.rows[0].count);
    }

    async createConfiguration(payload: z.infer<typeof configurationSchema>): Promise<Configuration> {
        const result = await query(
            `INSERT INTO configuration (cle, valeur, description, type_donnee) VALUES ($1, $2, $3, $4) RETURNING *`,
            [payload.cle, payload.valeur, payload.description, payload.type_donnee]
        );
        return result.rows[0] as Configuration;
    }

    async updateConfiguration(id: string, payload: Partial<z.infer<typeof configurationSchema>>): Promise<Configuration | null> {
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
            `UPDATE configuration SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Configuration;
    }

    async deleteConfiguration(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM configuration WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Configuration non trouvée");
        }
    }
} 