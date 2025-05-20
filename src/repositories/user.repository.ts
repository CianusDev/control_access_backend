import { z } from "zod";
import { query } from "../config/database";
import { User } from "../models/user.model";
import { userSchema } from "../schemas/user.schema";
import { generateRandomPassword, hashPassword } from "../utils/utils";

export class UserRepository {
    
    async createUser(payload: z.infer<typeof userSchema>):Promise<User | null>{
        
        const { email, username, firstname, lastname } = payload;

        const password =  generateRandomPassword();

        const hashedPassword = await hashPassword(password);

        const userExistsResult = await query(
            `SELECT * FROM users WHERE email = $1 OR username = $2`,
            [email, username]
        );

        const existingUser = userExistsResult.rows[0];

        if (existingUser) {
            const errorMessages: Record<string, string> = {};
            if (existingUser.email === email) errorMessages.email = "Email déjà utilisé";
            if (existingUser.username === username) errorMessages.username = "Nom d'utilisateur déjà utilisé";
            throw new Error(JSON.stringify(errorMessages));
        }

        const result = await query(
            `INSERT INTO users (username, password_hashed, email, firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [username, hashedPassword, email, firstname, lastname]
        );

        const user = result.rows[0];

        return {
            id: user.id,
            username: user.username,
            password_hashed: user.password_hashed,
            email: user.email,
            firstname: user.firstname,
            role_id:user.role_id,
            lastname: user.lastname,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }

    async updateUser(id: string, payload: z.infer<typeof userSchema>): Promise<User | null> {
        const { email, username, firstname, lastname } = payload;

        const userExistsResult = await query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        const existingUser = userExistsResult.rows[0];

        if (!existingUser) {
            throw new Error("User not found");
        }

        const result = await query(
            `UPDATE users SET username = $1, email = $2, firstname = $3, lastname = $4 WHERE id = $5`,
            [username, email, firstname, lastname, id]
        );

        const user = result.rows[0];

        return {
            id: user.id,
            username: user.username,
            password_hashed: user.password_hashed,
            email: user.email,
            firstname: user.firstname,
            role_id:user.role_id,
            lastname: user.lastname,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }

    async deleteUser(id: string): Promise<void> {
        const result = await query(
            `DELETE FROM users WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            throw new Error("User not found");
        }
    }

    async getUser(id: string): Promise<User | null> {
        const result = await query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        const user = result.rows[0];

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            username: user.username,
            password_hashed: user.password_hashed,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            role_id:user.role_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    }
    
}
