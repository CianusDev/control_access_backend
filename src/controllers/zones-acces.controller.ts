import { Request, Response } from "express";
import { ZoneAccesRepository } from "../repositories/zones-acces.repository";
import { zoneAccesSchema } from "../schemas/zones-acces.schema";

const zoneAccesRepository = new ZoneAccesRepository();

export class ZoneAccesController {
    static async getZones(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const zones = await zoneAccesRepository.getZones(limit, offset);
            return res.status(200).json({
                message: "Zones d'accès récupérées avec succès",
                zones,
                pagination: { limit, page, offset }
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération des zones d'accès",
                error: errorMessage,
            });
        }
    }

    static async getZone(req: Request, res: Response) {
        try {
            const zoneId = req.params.id;
            const zone = await zoneAccesRepository.getZone(zoneId);
            return res.status(200).json({
                message: "Zone d'accès récupérée avec succès",
                zone,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération de la zone d'accès",
                error: errorMessage,
            });
        }
    }

    static async createZone(req: Request, res: Response) {
        try {
            const validation = zoneAccesSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données zone d'accès",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const zone = await zoneAccesRepository.createZone(validation.data);
            return res.status(201).json({
                message: "Zone d'accès créée avec succès",
                zone,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la création de la zone d'accès",
                error: errorMessage,
            });
        }
    }

    static async updateZone(req: Request, res: Response) {
        try {
            const zoneId = req.params.id;
            const validation = zoneAccesSchema.partial().safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données zone d'accès (update)",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const zone = await zoneAccesRepository.updateZone(zoneId, validation.data);
            return res.status(200).json({
                message: "Zone d'accès modifiée avec succès",
                zone,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la modification de la zone d'accès",
                error: errorMessage,
            });
        }
    }

    static async deleteZone(req: Request, res: Response) {
        try {
            const zoneId = req.params.id;
            await zoneAccesRepository.deleteZone(zoneId);
            return res.status(200).json({
                message: "Zone d'accès supprimée avec succès",
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la suppression de la zone d'accès",
                error: errorMessage,
            });
        }
    }
} 