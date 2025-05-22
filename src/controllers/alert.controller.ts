import { Request, Response } from "express";
import { AlertRepository } from "../repositories/alert.repository";
import { alertSchema } from "../schemas/alert.schema";


const alertRepository = new AlertRepository();

export class AlertController {

    static async getAlerts(req: Request, res: Response) {
        try {
            const alerts = await alertRepository.getAlerts();
            return res.status(200).json({
                message: "Alerts récupérés avec succès",
                alerts,
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
                    message: "Erreur lors de la récupération des alerts",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async getAlert(req: Request, res: Response) {
        try {
            const alertId = req.params.id;
            const alert = await alertRepository.getAlert(alertId);
            return res.status(200).json({
                message: "Alert récupéré avec succès",
                alert,
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
                    message: "Erreur lors de la récupération de l'alert",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async createAlert(req: Request, res: Response) {
        try {
            const body = req.body 
            const validation = alertSchema.safeParse(body);
            if (!validation.success) {
                return res.status(400).json({
                    message: "Erreur lors de la validation de l'alert",
                    error: validation.error.flatten().fieldErrors,
                });
            }

            const alert = await alertRepository.createAlert(validation.data);
            return res.status(201).json({
                message: "Alert créé avec succès",
                alert,
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
                    message: "Erreur lors de la création de l'alert",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async deleteAlert(req: Request, res: Response) {
        try {
            const alertId = req.params.id;
            await alertRepository.deleteAlert(alertId);
            return res.status(200).json({
                message: "Alert supprimé avec succès",
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
                    message: "Erreur lors de la suppression de l'alert",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }

    static async updateDeletedAlert(req: Request, res: Response) {
        try {
            const alertId = req.params.id;
            await alertRepository.updateDeletedAlert(alertId);
            return res.status(200).json({
                message: "Alert supprimé avec succès",
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
                    message: "Erreur lors de la suppression de l'alert",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }
}   