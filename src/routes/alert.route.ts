import { AlertController } from "../controllers/alert.controller";
import express from 'express';
import { auth } from "../middlewares/auth.middleware";
import { isRoot } from "../middlewares/root.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer tous les alertes ( au moins manager)
router.get('/', 
    auth, 
    isManager, 
    sessionMiddleware,
    async(req, res) => {
    AlertController.getAlerts(req, res)
});

// récupérer un alerte ( au moins manager)
router.get('/:id', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    AlertController.getAlert(req, res)
});

// créer une alerte 
router.post('/', 
    auth, 
    async(req, res) => {
    AlertController.createAlert(req, res)
});

// modifier une alerte ( au moins admin)
router.put('/:id', 
    auth, 
    isAdmin, 
    sessionMiddleware, 
    async(req, res) => {
    AlertController.updateAlert(req, res)
});

// supprimer un alerte ( au moins root)
router.delete('/:id', 
    auth, 
    isRoot, async(req, res) => {
    AlertController.deleteAlert(req, res)
});      

export default router;