import { UserRepository } from "../repositories/user.repository";
import { Request, Response } from "express";
import { userSchema, userUpdateSchema } from "../schemas/user.schema";
import { generateUniqueCode } from "../utils/utils";
import { sendEmail } from "../utils/emailSender";
import { RoleRepository } from "../repositories/role.repository";
import { NiveauAcces } from "../models/niveau-acces";

const userRepository = new UserRepository();
const roleRepository = new RoleRepository();

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

            // Récupérer le rôle pour vérifier le niveau d'accès
            const role = await roleRepository.getRole(validation.data.role_id);
            if (!role) {
                return res.status(400).json({
                    message: "Rôle non trouvé",
                });
            }
            
            const user = await userRepository.createUser({
                ...validation.data,
                pin,
            });

            // Envoyer l'email avec les informations d'accès selon le niveau d'accès
            if (role.niveau_acces >= NiveauAcces.SUPERVISEUR) {
                // Pour les utilisateurs de niveau >= 3, envoyer le PIN et le mot de passe
                await sendEmail(user.email, `Votre compte Access Control a été bien créé`,
                    `
                    <h1>Bienvenue ${user.nom} ${user.prenom} !</h1>
                    <p>Votre compte a été créé avec succès.</p>
                    <p>Pour l'accès physique (badge) :</p>
                    <p>Votre code PIN : ${pin}</p>
                    <p>Pour l'accès à l'interface web :</p>
                    <p>Votre mot de passe : ${validation.data.password}</p>
                    <p>Veuillez changer votre mot de passe lors de votre première connexion.</p>
                    <p>Cordialement !</p>
                    `
                );
            } else {
                // Pour les utilisateurs de niveau < 3, envoyer uniquement le PIN
                await sendEmail(user.email, `Votre compte Access Control a été bien créé`,
                    `
                    <h1>Bienvenue ${user.nom} ${user.prenom} !</h1>
                    <p>Votre compte a été créé avec succès.</p>
                    <p>Pour l'accès physique (badge) :</p>
                    <p>Votre code PIN : ${pin}</p>
                    <p>Pour l'accès à l'interface web, veuillez contacter votre administrateur.</p>
                    <p>Cordialement !</p>
                    `
                );
            }

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
            const validation = userSchema.partial().safeParse(req.body);
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
            const [users, total] = await Promise.all([
                userRepository.getUsers(limit, offset),
                userRepository.countUsers()
            ]);
            return res.status(200).json({
                message: "Utilisateurs récupérés avec succès",
                users,
                pagination: { limit, page, offset, total }
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
