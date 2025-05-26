import { Request, Response } from "express";
import { ConfigurationRepository } from "../repositories/configuration.repository";
import { configurationSchema } from "../schemas/configuration.schema";

const configurationRepository = new ConfigurationRepository();

export class ConfigurationController {
    static async getConfigurations(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const configurations = await configurationRepository.getConfigurations(limit, offset);
            return res.status(200).json({
                message: "Configurations récupérées avec succès",
                configurations,
                pagination: { limit, page, offset }
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération des configurations",
                error: errorMessage,
            });
        }
    }

    static async getConfiguration(req: Request, res: Response) {
        try {
            const configurationId = req.params.id;
            const configuration = await configurationRepository.getConfiguration(configurationId);
            return res.status(200).json({
                message: "Configuration récupérée avec succès",
                configuration,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la récupération de la configuration",
                error: errorMessage,
            });
        }
    }

    static async createConfiguration(req: Request, res: Response) {
        try {
            const validation = configurationSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données configuration",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const configuration = await configurationRepository.createConfiguration(validation.data);
            return res.status(201).json({
                message: "Configuration créée avec succès",
                configuration,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la création de la configuration",
                error: errorMessage,
            });
        }
    }

    static async updateConfiguration(req: Request, res: Response) {
        try {
            const configurationId = req.params.id;
            const validation = configurationSchema.partial().safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur de validation des données configuration (update)",
                    error: validation.error.flatten().fieldErrors,
                });
            }
            const configuration = await configurationRepository.updateConfiguration(configurationId, validation.data);
            return res.status(200).json({
                message: "Configuration modifiée avec succès",
                configuration,
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la modification de la configuration",
                error: errorMessage,
            });
        }
    }

    static async deleteConfiguration(req: Request, res: Response) {
        try {
            const configurationId = req.params.id;
            await configurationRepository.deleteConfiguration(configurationId);
            return res.status(200).json({
                message: "Configuration supprimée avec succès",
            });
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : error;
            try { errorMessage = JSON.parse(errorMessage as string); } catch {}
            return res.status(400).json({
                message: "Erreur lors de la suppression de la configuration",
                error: errorMessage,
            });
        }
    }
} 