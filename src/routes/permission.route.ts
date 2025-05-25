import { PermissionController } from "../controllers/permission.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

// récupérer toutes les permissions ( au moins manager )
router.get('/', 
    auth, 
    isManager, 
    sessionMiddleware, async(req, res) => {
    PermissionController.getPermissions(req, res)
});

// récupérer une permission ( au moins manager )
router.get('/:id', auth, isManager, sessionMiddleware, async(req, res) => {
    PermissionController.getPermission(req, res)
});

// créer une permission ( au moins admin )
router.post('/', auth, isAdmin, sessionMiddleware, async(req, res) => {
    PermissionController.createPermission(req, res)
});

// modifier une permission ( au moins admin )
router.put('/:id', auth, isAdmin, sessionMiddleware, async(req, res) => {
    PermissionController.updatePermission(req, res)
});

// supprimer une permission ( au moins root)
router.delete('/:id', auth, isRoot, async(req, res) => {
    PermissionController.deletePermission(req, res)
});

export default router; 