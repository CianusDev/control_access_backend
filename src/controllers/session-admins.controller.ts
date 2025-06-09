import { Request, Response } from "express";
import { SessionAdminRepository } from "../repositories/session-admin.repository";
import { sessionAdminSchema } from "../schemas/session-admin.schema";

const sessionAdminRepository = new SessionAdminRepository();        

export class SessionAdminController {

    static async getSessions(req: Request, res: Response) {
        try{
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const [sessions, total] = await Promise.all([
                sessionAdminRepository.getSessions(limit, offset),
                sessionAdminRepository.countSessions()
            ]);

            if (sessions === null) {
                return res.status(500).json({ message: 'Erreur serveur' });
            }

            return res.status(200).json({
                message: "Sessions récupérées avec succès",
                sessions,
                pagination: { limit, page, offset, total }
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
                    message: "Erreur lors de la récupération des sessions",
                    error: errorMessage,
                });
            }   
        }
    }   

    static async getSession(req: Request, res: Response) {
        try {
            const session = await sessionAdminRepository.getSession(req.params.id);
            if (session === null) {
                return res.status(404).json({ message: 'Session non trouvée' });
            }
            
            return res.status(200).json({
                message: "Session récupérée avec succès",
                session
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
                    message: "Erreur lors de la récupération de la session",
                    error: errorMessage,
                });
            }   
        }
    }

    static async createSession(req: Request, res: Response) {
        try {
            const body = req.body 
            const validation = sessionAdminSchema.safeParse(body);

            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du session",
                    error: validation.error.flatten().fieldErrors,
                });
            }   

            const session = await sessionAdminRepository.createSession(validation.data);
            return res.status(201).json({
                session
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
                    message: "Erreur lors de la récupération des sessions",
                    error: errorMessage,
                });
            }   
        }
    }

    static async updateSession(req: Request, res: Response) {
        try{
            const body = req.body 
            const validation = sessionAdminSchema.partial().safeParse(body);

            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du session",
                    error: validation.error.flatten().fieldErrors,
                });
            }   

            const session = await sessionAdminRepository.createSession(validation.data);
            return res.status(201).json({
                session
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
                    message: "Erreur lors de la récupération des sessions",
                    error: errorMessage,
                });
            }   
        }
    }       

    static async deleteSession(req: Request, res: Response) {
        try{
            await sessionAdminRepository.deleteSession(req.params.id);
            return res.status(204).send();
        } catch (error) {
            if (error instanceof Error) {
                let errorMessage;
                try {
                    errorMessage = JSON.parse(error.message);
                } catch {
                    errorMessage = error.message;
                }

                return res.status(400).json({
                    message: "Erreur lors de la suppression de la session",
                    error: errorMessage,
                });
            }   
        }
    }     
}
    
    
    
    




