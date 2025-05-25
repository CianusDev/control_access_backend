import { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from '../utils/utils';
import { query } from '../config/database';
import { UserStatus } from '../models/user.model';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        roleId: string;
    };
}

// Middleware pour vérifier si l'utilisateur est authentifié
export const auth = async(req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = verifyUserToken(token, process.env.JWT_SECRET!);

        // console.log('decoded', decoded);

        if(!decoded) {
            res.status(401).json({ message: 'Authorisation requise' });
            return;
        }

        const { userId, roleId } = decoded;

        const userResult = await query(
            `SELECT * FROM utilisateurs WHERE id = $1`,
            [userId]
        );

        if (!userResult.rows[0]) {
            res.status(401).json({ message: 'Authentification requise' });
            return;
        }

        if (userResult.rows[0].statut !== UserStatus.actif) {
            res.status(403).json({ message: 'Compte inactif, suspendu ou banni' });
            return;
        }
        
        req.user = { userId, roleId };

        next();

    } catch (err) {
        res.status(401).json({ message: 'Authentication required' });
    }
};