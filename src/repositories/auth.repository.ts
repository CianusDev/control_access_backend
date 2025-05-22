import { z } from "zod";
import { query } from "../config/database";
import { User } from "../models/user.model";
import { loginSchema } from "../schemas/auth.schema";
import { comparePassword, createUserToken, hashPassword } from "../utils/utils";

export class AuthRepository {

    async login(payload: z.infer<typeof loginSchema>): Promise<User> {
        // Validation des données
        const validation = loginSchema.safeParse(payload);

        if (!validation.success) {
            const errors = validation.error.flatten().fieldErrors;
            throw new Error(JSON.stringify(errors));
        }

        const { password, username } = payload;

        const result = await query(
            `SELECT * FROM users WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];

        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }

        const isPasswordValid = await comparePassword(password, user.password_hashed);

        if (!isPasswordValid) {
            throw new Error("E-mail ou Mot de passe incorrect");
        }

        const token = createUserToken(user.id, process.env.JWT_SECRET!);

        return {
            token,
            ...user,
        } as User;
    }

    async getCurrentUser(id: string): Promise<User | null> {
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
}
