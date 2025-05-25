import { AccessLogController } from "../controllers/access-log.controller";
import express from 'express';
import { auth } from "../middlewares/auth.middleware";
import { isRoot } from "../middlewares/root.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer tous les logs d'accès ( au moins manager)
router.get('/', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    AccessLogController.getAccessLogs(req, res)
});

// récupérer un log d'accès ( au moins manager)
router.get('/:id', 
    auth, 
    isManager,
    sessionMiddleware,
    async(req, res) => {
    AccessLogController.getAccessLog(req, res)
});

// créer un log d'accès
router.post('/', 
    auth, 
    sessionMiddleware,
    async(req, res) => {
    AccessLogController.createAccessLog(req, res)
});

// modifier un log d'accès ( au moins root )
router.put('/:id', 
    auth, 
    isRoot, 
    sessionMiddleware,
    async(req, res) => {
    AccessLogController.updateAccessLog(req, res)
});

// supprimer un log d'accès ( au moins root )
router.delete('/:id', 
    auth, 
    isRoot, 
    sessionMiddleware,
    async(req, res) => {
    AccessLogController.deleteAccessLog(req, res)
});

export default router;