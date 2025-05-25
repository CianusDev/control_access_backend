import { ZoneAccesController } from "../controllers/zones-acces.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer toutes les zones d'accès ( au moins manager)
router.get('/', auth, isManager, async(req, res) => {
    ZoneAccesController.getZones(req, res)
});

// récupérer une zone d'accès ( au moins manager)
router.get('/:id', auth, isManager, sessionMiddleware, async(req, res) => {
    ZoneAccesController.getZone(req, res)
});

// créer une zone d'accès ( au moins admin)
router.post('/', auth, isAdmin, sessionMiddleware, async(req, res) => {
    ZoneAccesController.createZone(req, res)
});

// modifier une zone d'accès ( au moins admin)
router.put('/:id', auth, isAdmin, sessionMiddleware, async(req, res) => {
    ZoneAccesController.updateZone(req, res)
});

// supprimer une zone d'accès ( au moins root)
router.delete('/:id', auth, isRoot, async(req, res) => {
    ZoneAccesController.deleteZone(req, res)
});

export default router; 