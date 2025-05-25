// Middleware pour vérifier si l'utilisateur est un manager

import { Request, Response, NextFunction } from 'express';
import { RoleRepository } from '../repositories/role.repository';

const roleRepository = new RoleRepository();

export const isManager = async (req: Request & { user?: { userId: string , roleId: string } }, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({ message: 'Authentification requise' });
            return;
            
        }
        const role = await roleRepository.getRole(user.roleId);
        
        if (!role || role.niveau_acces < 3) {
            res.status(403).json({ message: 'Vous n\'avez pas les droits pour accéder à cette action' });
            return;
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentification requise' });
        return;
    }
}
