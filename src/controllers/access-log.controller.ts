import { Request, Response } from "express";
import { AccessLogRepository } from "../repositories/access-log.repository";
import { accessLogSchema } from "../schemas/access-log.schema";

const accessLogRepository = new AccessLogRepository();

export class AccessLogController {

    static async getAccessLogs(req: Request, res: Response) {
        const accessLogs = await accessLogRepository.getAccessLogs();

        if (accessLogs === null) {
            res.status(500).json({ message: 'Erreur serveur' });
        } else {
            res.status(200).json(accessLogs);
        }
    }

    static async getAccessLog(req: Request, res: Response) {
        const accessLog = await accessLogRepository.getAccessLog(req.params.id);

        if (accessLog === null) {
            res.status(404).json({ message: 'AccessLog not found' });
        } else {
            res.status(200).json(accessLog);
        }
    }

    static async createAccessLog(req: Request, res: Response) {
        const body = req.body 
        const validation = accessLogSchema.safeParse(body);
        if (!validation.success) {          
            return res.status(400).json({
                message: "Erreur lors de la validation du accessLog",
                error: validation.error.flatten().fieldErrors,
            });
        }   

        const accessLog = await accessLogRepository.createAccessLog(validation.data);

        if (accessLog === null) {
            res.status(500).json({ message: 'Erreur serveur' });
        } else {
            res.status(201).json(accessLog);
        }
    }

    static async updateAccessLog(req: any, res: any) {
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

        if (accessLog === null) {
            res.status(500).json({ message: 'Erreur serveur' });
        } else {
            res.status(200).json(accessLog);
        }
    }   
    
    static async deleteAccessLog(req: any, res: any) {
        await accessLogRepository.deleteAccessLog(req.params.id);
        res.status(204).json({ message: 'Access log deleted' });
    }

}