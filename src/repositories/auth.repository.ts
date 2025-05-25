import { query } from "../config/database";
import { User } from "../models/user.model";
import { comparePassword } from "../utils/utils";

export class AuthRepository {
    async login(email: string, password: string): Promise<User | null> {
        // Recherche l'utilisateur par email
        const result = await query(
            `SELECT * FROM utilisateurs WHERE email = $1`,
            [email]
        );

        const user = result.rows[0] as User;

        if (!user || !user.password_hash) {
            return null;
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            return null;
        }

        return user;
    }

    async getCurrentUser(id: string): Promise<User | null> {
        const result = await query(
            `SELECT * FROM utilisateurs WHERE id = $1`,
            [id]
        );
        const user = result.rows[0] as User;
        if (!user) {
            return null;
        }
        return user;
    }
}
