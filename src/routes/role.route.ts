import { RoleController } from "../controllers/role.controller";
import { auth } from "../middlewares/auth.middleware";
import express from 'express';
const router = express.Router();

// creer un nouveau role
router.post('/', auth, async(req, res) => {
    RoleController.createRole(req, res)
});

// récupérer tous les roles
router.get('/', auth, async(req, res) => {
    RoleController.getRoles(req, res)
});

// récupérer un role
router.get('/:id', auth,async(req, res) => {
    RoleController.getRole(req, res)
});

// modifier un role
router.put('/:id', auth, async(req, res) => {
    RoleController.updateRole(req, res)
});

// supprimer un role
router.delete('/:id', auth, async(req, res) => {
    RoleController.deleteRole(req, res)
});

export default router;