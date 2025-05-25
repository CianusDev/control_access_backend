// Middleware pour vérifier si l'utilisateur est un administrateur

import { Request, Response, NextFunction } from 'express';
import { RoleRepository } from '../repositories/role.repository';

const roleRepository = new RoleRepository();

interface AuthRequest extends Request {
    user?: {
        userId: string;
        roleId: string;
    };
}

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({ message: 'Authentification requise' });
            return;
        }

        const role = await roleRepository.getRole(user.roleId);
        if (!role || role.niveau_acces < 4) {
            res.status(403).json({ message: 'Vous n\'avez pas les droits pour accéder à cette action' });
            return;
        }
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentification requise' });
        return;
    }
}   