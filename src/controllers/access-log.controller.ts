import { Request, Response } from "express";
import { AccessLogRepository } from "../repositories/access-log.repository";
import { accessLogSchema } from "../schemas/access-log.schema";

const accessLogRepository = new AccessLogRepository();

export class AccessLogController {

    static async getAccessLogs(req: Request, res: Response) {
        try {
            const accessLogs = await accessLogRepository.getAccessLogs();
            return res.status(200).json({
                message: "AccessLogs récupérés avec succès",
                accessLogs,
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
                    message: "Erreur lors de la récupération des accessLogs",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async getAccessLog(req: Request, res: Response) {
        try {
            const accessLogId = req.params.id;
            const accessLog = await accessLogRepository.getAccessLog(accessLogId);
            return res.status(200).json({
                message: "AccessLog récupéré avec succès",
                accessLog,
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
                    message: "Erreur lors de la récupération du accessLog",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async createAccessLog(req: Request, res: Response) {
       try {
            const body = req.body 
            const validation = accessLogSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du accessLog",
                    error: validation.error.flatten().fieldErrors,
                });
            }   

            const accessLog = await accessLogRepository.createAccessLog(validation.data);
            return res.status(201).json({
                message: "AccessLog créé avec succès",
                accessLog,
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
                    message: "Erreur lors de la création du accessLog",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async updateAccessLog(req: any, res: any) {
        try {
            const accessLogId = req.params.id;
            const body = req.body 
            const validation = accessLogSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du accessLog",
                    error: validation.error.flatten().fieldErrors,
                });
            }   
            const accessLog = await accessLogRepository.updateAccessLog(accessLogId, validation.data);
            return res.status(200).json({
                message: "AccessLog modifié avec succès",
                accessLog,
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
                    message: "Erreur lors de la modification du accessLog",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }   
    
    static async deleteAccessLog(req: any, res: any) {
        try {
            const accessLogId = req.params.id;
            await accessLogRepository.deleteAccessLog(accessLogId);
            return res.status(200).json({
                message: "AccessLog supprimé avec succès",
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
                    message: "Erreur lors de la suppression du accessLog",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async updateDeletedAccessLog(req: Request, res: Response) {
        try {
            const accessLogId = req.params.id;
            await accessLogRepository.updateDeletedAccessLog(accessLogId);
            return res.status(200).json({
                message: "AccessLog supprimé avec succès",
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
                    message: "Erreur lors de la suppression du accessLog",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }
}