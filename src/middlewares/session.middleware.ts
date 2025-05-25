// Vérifier si l'utilisateur est connecté

import { NextFunction, Response } from "express";
import { AuthRequest } from "./auth.middleware";
import { SessionAdminRepository } from "../repositories/session-admin.repository";

const sessionAdminRepository = new SessionAdminRepository();

export const sessionMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { userId } = req.user!;

    const session = await sessionAdminRepository.getSessionByUserId(userId);
    if (!session) {
        res.status(401).json({ message: "Veuillez vous connecter" });
        return;
    }

    const now = new Date();
    // console.log({session: session.expires_at , now})
    if (session.expires_at < now) {
        await sessionAdminRepository.deleteSession(session.id);
        res.status(401).json({ message: "Votre session a expiré, veuillez vous reconnecter" });
        return;
    }

    next();
}
