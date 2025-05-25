import { UserRepository } from "../repositories/user.repository";
import { Request, Response } from "express";
import { userSchema, userUpdateSchema } from "../schemas/user.schema";
import { generateUniqueCode } from "../utils/utils";
import { sendEmail } from "../utils/emailSender";

const userRepository = new UserRepository();

export class UserController {

    static async createUser(req: Request, res: Response) {
        try {
            const pin = generateUniqueCode();
            const validation = userSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données utilisateur",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const user = await userRepository.createUser({
                ...validation.data,
                pin,
            });

            await sendEmail(user.email,`Nouvelle utilisateur creer`,
                `
                <h1>Bienvenue ${user.nom} ${user.prenom} </h1>
                <p>Voici votre code pin : ${pin} </p>
                `
            )
            return res.status(201).json({
                message: "Utilisateur créé avec succès",
                user,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la création de l'utilisateur",
                error: errorMessage,
            });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            const validation = userUpdateSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données utilisateur (update)",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const user = await userRepository.updateUser(userId, validation.data);
            return res.status(200).json({
                message: "Utilisateur modifié avec succès",
                user,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la modification de l'utilisateur",
                error: errorMessage,
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
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la suppression de l'utilisateur",
                error: errorMessage,
            });
        }
    }

    static async getUser(req: Request, res: Response) {
        try {
            const userId = req.params.id;
            const user = await userRepository.getUser(userId);
            return res.status(200).json({
                message: "Utilisateur récupéré avec succès",
                user,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération de l'utilisateur",
                error: errorMessage,
            });
        }
    }

    static async getUsers(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const users = await userRepository.getUsers(limit, offset);
            return res.status(200).json({
                message: "Utilisateurs récupérés avec succès",
                users,
                pagination: { limit, page, offset }
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération des utilisateurs",
                error: errorMessage,
            });
        }
    }
}
