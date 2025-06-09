import { z } from "zod";
import { query } from "../config/database";
import { Role } from "../models/role.model";
import { roleSchema } from "../schemas/role.schema";

export class RoleRepository {
    
    async getRoles(limit = 20, offset = 0): Promise<Role[]> {
        const result = await query(
            `SELECT * FROM roles ORDER BY id LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows as Role[];
    }

    async getRole(id: string): Promise<Role | null> {
        const result = await query(
            `SELECT * FROM roles WHERE id = $1`,
            [id]
        );
        return result.rows[0] as Role || null;
    }

    async countRoles(): Promise<number> {
        const result = await query(
            `SELECT COUNT(*) FROM roles`
        );
        return parseInt(result.rows[0].count);
    }

    async createRole(payload: z.infer<typeof roleSchema>): Promise<Role> {
        const roleExistsResult = await query(
            `SELECT * FROM roles WHERE nom = $1`,
            [payload.nom]
        );
        
        if (roleExistsResult.rows[0]) {
            throw new Error("Nom de rôle déjà utilisé");
        }
        
        const result = await query(
            `INSERT INTO roles (nom, description, niveau_acces) VALUES ($1, $2, $3) RETURNING *`,
            [payload.nom, payload.description, payload.niveau_acces]
        );
        
        return result.rows[0] as Role;
    }

    async updateRole(id: string, payload: Partial<z.infer<typeof roleSchema>>): Promise<Role | null> {
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
            `UPDATE roles SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] as Role;
    }

    async deleteRole(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM roles WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            throw new Error("Role non trouvé");
        }
    }

}