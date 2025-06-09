import { RoleController } from "../controllers/role.controller";
import { auth } from "../middlewares/auth.middleware";
import express, { RequestHandler } from 'express';
import { isRoot } from "../middlewares/root.middleware";
import { isAdmin } from "../middlewares/admin.middleware";
import { isManager } from "../middlewares/manager.middleware";
import { sessionMiddleware } from "../middlewares/session.middleware";
const router = express.Router();

const createRoleHandler : RequestHandler =  async(req, res) => {
    RoleController.createRole(req, res)
}

const updateRoleHandler : RequestHandler = async (req, res) => {
    await RoleController.updateRole(req, res);
};

const getRoleHandler : RequestHandler =  async(req, res) => {
    RoleController.getRole(req, res)
}

const getRolesHandler : RequestHandler =  async(req, res) => {
    RoleController.getRoles(req, res)
}



// creer un nouveau role ( au moins admin )
router.post('/', auth, isAdmin, sessionMiddleware, createRoleHandler);

// récupérer tous les roles ( au moins manager )
router.get('/', auth, isManager, sessionMiddleware, getRolesHandler);

// récupérer un role ( au moins manager )
router.get('/:id', auth, isManager, sessionMiddleware, getRoleHandler);

// modifier un role ( au moins admin )
router.put('/:id', auth, isAdmin, sessionMiddleware, updateRoleHandler);

// supprimer un role ( au moins root )
router.delete('/:id', auth, isRoot, async(req, res) => {
    RoleController.deleteRole(req, res)
});

export default router;