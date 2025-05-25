import { Request, Response } from "express";
import { SessionAdminRepository } from "../repositories/session-admin.repository";

const sessionAdminRepository = new SessionAdminRepository();        

export class SessionAdminController {

    static async getSessionAdmins(req: Request, res: Response) {
        const sessionAdmins = await sessionAdminRepository.getSessions();
        res.status(200).json(sessionAdmins);
    }   

    static async getSessionAdmin(req: Request, res: Response) {
        const sessionAdmin = await sessionAdminRepository.getSession(req.params.id);
        res.status(200).json(sessionAdmin);
    }

    static async createSessionAdmin(req: Request, res: Response) {
        const sessionAdmin = await sessionAdminRepository.createSession(req.body);
        res.status(201).json(sessionAdmin);
    }

    static async updateSessionAdmin(req: Request, res: Response) {
        const sessionAdmin = await sessionAdminRepository.updateSession(req.params.id, req.body);
        res.status(200).json(sessionAdmin);
    }       

    static async deleteSessionAdmin(req: Request, res: Response) {
        const sessionAdmin = await sessionAdminRepository.deleteSession(req.params.id);
        res.status(200).json(sessionAdmin);
    }       
}
    
    
    
    




