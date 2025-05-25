import { ConfigurationController } from "../controllers/configuration.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer toutes les configurations ( au moins manager)
router.get('/', auth, isManager, sessionMiddleware, async(req, res) => {
    ConfigurationController.getConfigurations(req, res)
});

// récupérer une configuration ( au moins manager)
router.get('/:id', auth, isManager, sessionMiddleware, async(req, res) => {
    ConfigurationController.getConfiguration(req, res)
});

// créer une configuration ( au moins admin)
router.post('/', auth, isAdmin, sessionMiddleware, async(req, res) => {
    ConfigurationController.createConfiguration(req, res)
});

// modifier une configuration ( au moins admin)
router.put('/:id', auth, isAdmin, sessionMiddleware, async(req, res) => {
    ConfigurationController.updateConfiguration(req, res)
});

// supprimer une configuration ( au moins root)
router.delete('/:id', auth, isRoot, async(req, res) => {
    ConfigurationController.deleteConfiguration(req, res)
});

export default router; 