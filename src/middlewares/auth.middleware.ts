import { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from '../utils/utils';

interface AuthRequest extends Request {
    user?: any;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = verifyUserToken(token, process.env.JWT_SECRET!);

        req.user= decoded;

        next();

    } catch (err) {
        res.status(401).json({ message: 'Authentication required' });
    }
};