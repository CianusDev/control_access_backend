import { z } from "zod";
import { query } from "../config/database";
import { User } from "../models/user.model";
import { userSchema, userUpdateSchema } from "../schemas/user.schema";
import { generateRandomPassword, hashPassword } from "../utils/utils";

export class UserRepository {
    
    async createUser(payload: z.infer<typeof userSchema>):Promise<User | null>{
        
        const { email, username, firstname, lastname, role_id } = payload;

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
            `INSERT INTO users (username, password_hashed, email, firstname, lastname, role_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [username, hashedPassword, email, firstname, lastname , role_id]
        );

        const user = result.rows[0];

        return user as User;
    }

    async updateUser(id: string, payload: z.infer<typeof userUpdateSchema>): Promise<User | null> {
        const { email, username, firstname, lastname } = payload;

        const userExistsResult = await query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        const existingUser = userExistsResult.rows[0];

        console.log({existingUser})

        if (!existingUser) {
            throw new Error("User not found");
        }

        const result = await query(
            `UPDATE users SET username = $1, email = $2, firstname = $3, lastname = $4 WHERE id = $5 RETURNING *`,
            [username, email, firstname, lastname, id]
        );

        const user = result.rows[0];

        return user as User;
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

        return user as User;
    }

    async getUsers(): Promise<User[]|null> {
        const result = await query(
            `SELECT * FROM users`
        );

        const users = result.rows

        return users as User[];
    }

    async updateDeletedUser(id: string): Promise<void> {
        const userExistsResult = await query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );

        const existingUser = userExistsResult.rows[0];

        if (!existingUser) {
            throw new Error("User not found");
        }
        
        await query(
            `UPDATE users SET is_deleted = true WHERE id = $1 RETURNING *`,
            [id]
        );
    }

}
