import { UserRepository } from "../repositories/user.repository";
import { Request, Response } from "express";
import { userSchema } from "../schemas/user.schema";

const userRepository = new UserRepository();

export class UserController {

    static async createUser(req: Request, res: Response) {
        try {
            const body = req.body 
            const validation = userSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du user (create)",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            
            const user = await userRepository.createUser(validation.data);
            return res.status(201).json({
                message: "Utilisateur créé avec succès",
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
                    message: "Erreur lors de la création de l'utilisateur",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }
    
    // Route pour la modification d'un utilisateur
    static async updateUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            const body = req.body 
            const validation = userSchema.safeParse(body);

            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du user (update)",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const user = await userRepository.updateUser(userId, validation.data);
            return res.status(200).json({
                message: "Utilisateur modifié avec succès",
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
                    message: "Erreur lors de la modification de l'utilisateur",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async deleteUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            await userRepository.deleteUser(userId);
            return res.status(200).json({
                message: "Utilisateur supprimé avec succès",
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
                    message: "Erreur lors de la suppression de l'utilisateur",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async getUser(req: Request & { user?: any }, res: Response) {
        try {
            const userId = req.params.id;
            const user = await userRepository.getUser(userId);
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
