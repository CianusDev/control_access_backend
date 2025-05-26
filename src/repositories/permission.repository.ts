import { z } from "zod";
import { query } from "../config/database";
import { Permission } from "../models/permission.model";
import { permissionSchema } from "../schemas/permission.schema";

export class PermissionRepository {
    async getPermissions(limit = 20, offset = 0): Promise<Permission[]> {
        const result = await query(
            `SELECT * FROM permissions ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Permission[];
    }

    async getPermission(id: string): Promise<Permission | null> {
        const result = await query(
            `SELECT * FROM permissions WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Permission || null;
    }

    async createPermission(payload: z.infer<typeof permissionSchema>): Promise<Permission> {
        const result = await query(
            `INSERT INTO permissions (role_id, zone_acces_id, heure_debut, heure_fin, jours_semaine, actif) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [payload.role_id, payload.zone_acces_id, payload.heure_debut, payload.heure_fin, payload.jours_semaine, payload.actif]
        );
        return result.rows[0] as Permission;
    }

    async updatePermission(id: string, payload: Partial<z.infer<typeof permissionSchema>>): Promise<Permission | null> {
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
            `UPDATE permissions SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Permission;
    }

    async deletePermission(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM permissions WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Permission non trouvée");
        }
    }

    async checkUserPermission(userId: string, zoneId: string): Promise<boolean> {
        const result = await query(
            `SELECT p.* FROM permissions p
            INNER JOIN roles r ON p.role_id = r.id
            INNER JOIN users u ON u.role_id = r.id
            WHERE u.id = $1 AND p.zone_acces_id = $2
            AND p.actif = true
            AND EXTRACT(DOW FROM CURRENT_TIMESTAMP) = ANY(p.jours_semaine)
            AND CURRENT_TIME BETWEEN p.heure_debut AND p.heure_fin`,
            [userId, zoneId]
        );
        return result.rows.length > 0;
    }
} 