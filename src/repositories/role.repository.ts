import { z } from "zod";
import { query } from "../config/database";
import { Role } from "../models/role.model";
import { roleSchema } from "../schemas/role.schema";


export class RoleRepository {

    async getRoles(): Promise<Role[]|null> {
        const result = await query(
            `SELECT * FROM roles`
        );

        return result.rows as Role[];
    }

    async getRole(id: string): Promise<Role|null> {
        const result = await query(
            `SELECT * FROM roles WHERE id = $1`,
            [id]
        );

        return result.rows[0] as Role;
    }

    async createRole(payload: z.infer<typeof roleSchema>): Promise<Role|null> {
        
        const roleExistsResult = await query(
            `SELECT * FROM roles WHERE name = $1`,
            [payload.name]
        );

        const existingRole = roleExistsResult.rows[0];

        if (existingRole) {
            const errorMessages: Record<string, string> = {};
            if (existingRole.name === payload.name) errorMessages.name = "Nom de role déjà utilisé";
            throw new Error(JSON.stringify(errorMessages));
        }

        const result = await query(
            `INSERT INTO roles (name) VALUES ($1) RETURNING *`,
            [payload.name]
        );

        return result.rows[0] as Role;
    }

    async updateRole(id: string, payload: z.infer<typeof roleSchema>): Promise<Role|null> {
        const validation = roleSchema.safeParse(payload);

        if (!validation.success) {
            const errors = validation.error.flatten().fieldErrors;
            throw new Error(JSON.stringify(errors));
        }

        const result = await query(
            `UPDATE roles SET name = $1 WHERE id = $2`,
            [payload.name, id]
        );

        return result.rows[0] as Role;
    }


    async deleteRole(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM roles WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("Role not found");
        }
    }
    
}