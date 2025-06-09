import { StatsController } from "../controllers/stats.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";

const router = express.Router();

// Récupérer les statistiques du tableau de bord (au moins manager)
router.get('/', 
    auth, 
    isManager, 
    sessionMiddleware, 
    async(req, res) => {
        StatsController.getDashboardStats(req, res)
    }
);

export default router; 