import { AuthRepository } from "../repositories/auth.repository";
import { Request, Response } from "express";
import { SessionAdminRepository } from "../repositories/session-admin.repository";
import { createUserToken } from "../utils/utils";
import { query } from "../config/database";
import { StringValue } from 'ms';
import { RoleRepository } from "../repositories/role.repository";
import { getClientIP } from "../utils/ip-utils";

const authRepository = new AuthRepository();
const sessionAdminRepository = new SessionAdminRepository();
const roleRepository = new RoleRepository();

export class AuthController {
    
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const user = await authRepository.login(email, password);

            if (!user) {
                return res.status(401).json({ message: "Email ou mot de passe incorrect" });
            }

            // Vérification du niveau d'accès pour le dashboard
            const roleResult = await roleRepository.getRole(user.role_id);

            const niveauAcces = roleResult?.niveau_acces;

            // Si l'utilisateur n'est pas au moins un manager, on ne lui donne pas accès au dashboard
            if (!niveauAcces || niveauAcces < 3) {
                return res.status(403).json({ message: "Vous n'avez pas les droits pour accéder à cette section" });
            }

            // Vérification si l'utilisateur est déjà connecté
            const session = await sessionAdminRepository.getSessionByUserId(user.id);
            if (session) {
                // Supprimer la session existante
                await sessionAdminRepository.deleteSession(session.id);
            }

            // Générer le token JWT (maintenant dans le contrôleur)
            const token = createUserToken(
                user.id,
                process.env.JWT_SECRET!,
                process.env.JWT_EXPIRATION as StringValue,
                user.role_id
            );

            try {
                await sessionAdminRepository.createSession({
                    utilisateur_id: user.id,
                    adresse_ip: getClientIP(req),
                    user_agent: req.headers['user-agent'],
                });
                console.log(`✅ Session admin créée pour l'utilisateur ${user.id} depuis l'IP: ${getClientIP(req)}`);
            } catch (sessionError) {
                console.error('❌ Erreur lors de la création de la session admin :', sessionError);
            }

            return res.status(200).json({
                message: "Connexion réussie",
                user,
                token,
            });
            
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la connexion",
                error: errorMessage,
            });
        }
    }

    static async logout(req: Request & { user?: { userId: string , roleId: string } }, res: Response) {
        try {
            const { userId } = req?.user!;
            await sessionAdminRepository.deleteSession(userId);
            return res.status(200).json({
                message: "Déconnexion réussie", 
            });
        } catch (error) {
            return res.status(400).json({
                message: "Erreur lors de la déconnexion",
                error: error,
            }); 
        }
    }

    static async getCurrentUser(req: Request & { user: { userId: string , roleId: string } }, res: Response) {
        try {
            const { userId } = req.user;
            const user = await authRepository.getCurrentUser(userId);
            return res.status(200).json({
                message: "Utilisateur récupéré avec succès",
                user,
            });
            
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { 
                errorMessage = JSON.parse(errorMessage as string);
            } catch {
                errorMessage = errorMessage as string;
            }
            return res.status(400).json({
                message: "Erreur lors de la récupération de l'utilisateur",
                error: errorMessage,
            });
        }
    }

}
