import { Request, Response } from "express";
import { BadgeRepository } from "../repositories/badge.repository";
import { badgeSchema, updateBadgeSchema } from "../schemas/badge.schema";

const badgeRepository = new BadgeRepository();

export class BadgeController {

    static async getBadges(req: Request, res: Response) {
        try {
            const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const offset = (page - 1) * limit;
            const badges = await badgeRepository.getBadges(limit, offset);
            return res.status(200).json({
                message: "Badges récupérés avec succès",
                badges,
                pagination: { limit, page, offset }
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
                    message: "Erreur lors de la récupération des badges",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async getBadge(req: Request, res: Response) {
        try {
            const badgeId = req.params.id;
            const badge = await badgeRepository.getBadge(badgeId);

            if (!badge) {
                return res.status(404).json({
                    message: "Badge not found",
                });
            }
            
            return res.status(200).json({
                message: "Badge récupéré avec succès",
                badge,
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
                    message: "Erreur lors de la récupération du badge",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async createBadge(req: Request, res: Response) {
        try {
            const body = req.body 
            const validation = badgeSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du badge",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const badge = await badgeRepository.createBadge(validation.data);
            return res.status(201).json({
                message: "Badge créé avec succès",
                badge,
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
                    message: "Erreur lors de la création du badge",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async updateBadge(req: Request, res: Response) {
        try {
            const badgeId = req.params.id;
            const body = req.body 
            const validation = updateBadgeSchema.partial().safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation du badge",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const badge = await badgeRepository.updateBadge(badgeId, validation.data);
            return res.status(200).json({
                message: "Badge modifié avec succès",
                badge,
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
                    message: "Erreur lors de la modification du badge",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async deleteBadge(req: Request, res: Response) {
        try {
            const badgeId = req.params.id;
            await badgeRepository.deleteBadge(badgeId);
            return res.status(200).json({
                message: "Badge supprimé avec succès",
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
                    message: "Erreur lors de la suppression du badge",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

}   