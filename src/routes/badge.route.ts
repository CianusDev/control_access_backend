import { BadgeController } from "../controllers/badge.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer tous les badges ( au moins manager)
router.get('/', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    BadgeController.getBadges(req, res)
});

// récupérer un badge ( au moins manager)
router.get('/:id', 
    auth, 
    isManager, 
    sessionMiddleware,
    async(req, res) => {
    BadgeController.getBadge(req, res)
});

// créer un badge ( au moins admin)
router.post('/', 
    auth, 
    isAdmin, 
    sessionMiddleware, 
    async(req, res) => {
    BadgeController.createBadge(req, res)
});

// modifier un badge ( au moins admin)
router.put('/:id', 
    auth, 
    isAdmin, 
    sessionMiddleware, 
    async(req, res) => {
    BadgeController.updateBadge(req, res)
});

// supprimer un badge ( au moins root)
router.delete('/:id',
    auth,
    isRoot,
    sessionMiddleware,
    async(req, res) => {
    BadgeController.deleteBadge(req, res)
});

export default router;