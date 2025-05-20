import { AuthRepository } from "../repositories/auth.repository";
import { Request, Response } from "express";

const authRepository = new AuthRepository();

export class AuthController {


    static async login(req: Request, res: Response) {
        try {
            const user = await authRepository.login(req.body);
            return res.status(200).json({
                message: "Connexion réussie",
                user,
            });
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la connexion",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async getCurrentUser(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.user;
            const user = await authRepository.getCurrentUser(userId);
            return res.status(200).json({
                message: "Utilisateur récupéré avec succès",
                user,
            });
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la récupération de l'utilisateur",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }
}
