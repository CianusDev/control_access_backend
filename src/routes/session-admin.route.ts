import { SessionAdminController } from "../controllers/session-admins.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";

const router = express.Router();

// récupérer toutes les sessions (au moins manager)
router.get('/', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    SessionAdminController.getSessions(req, res)
});

// récupérer une session (au moins manager)
router.get('/:id', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    SessionAdminController.getSession(req, res)
});

// supprimer une session (au moins root)
router.delete('/:id', 
    auth, 
    isRoot,
    sessionMiddleware,
    async(req, res) => {
    SessionAdminController.deleteSession(req, res)
});

export default router; 