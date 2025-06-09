import { Request, Response } from "express";
import { StatsRepository } from "../repositories/stats.repository";
import { UserRepository } from "../repositories/user.repository";
import { DeviceRepository } from "../repositories/device.repository";
import { BadgeRepository } from "../repositories/badge.repository";

const statsRepository = new StatsRepository();
const userRepository = new UserRepository();
const deviceRepository = new DeviceRepository();
const badgeRepository = new BadgeRepository();

export class StatsController {
    static async getDashboardStats(req: Request, res: Response) {
        try {
            // Récupérer les statistiques du tableau de bord
            const [dashboardStats, userCount, deviceCount, badgeCount] = await Promise.all([
                statsRepository.getDashboardStats(),
                userRepository.countUsers(),
                deviceRepository.countDevices(),
                badgeRepository.countBadges()
            ]);

            return res.status(200).json({
                message: "Statistiques du tableau de bord récupérées avec succès",
                stats: {
                    ...dashboardStats,
                    counts: {
                        users: userCount,
                        devices: deviceCount,
                        badges: badgeCount
                    }
                }
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
                    message: "Erreur lors de la récupération des statistiques",
                    error: errorMessage,
                });
            }

            return res.status(500).json({
                message: "Erreur interne du serveur",
            });
        }
    }
} 