import { UserController } from '../controllers/user.controller';
import { auth } from '../middlewares/auth.middleware';
import express from 'express';
import { isRoot } from '../middlewares/root.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { isManager } from '../middlewares/manager.middleware';
import { sessionMiddleware } from '../middlewares/session.middleware';
const router = express.Router();

// Route pour la récupération des informations d'un utilisateur ( au moins manager)
router.get('/me', auth, isManager,sessionMiddleware, async(req, res) => {
    UserController.getUser(req, res)
});

// Route pour la récupération de tous les utilisateurs ( au moins manager)
router.get('/', auth, isManager, sessionMiddleware, async(req, res) => {
    UserController.getUsers(req, res)
});

// Route pour la récupération d'un utilisateur ( au moins manager)
router.get('/:id', auth , isManager, sessionMiddleware, async(req, res) => {
    UserController.getUser(req, res)
});

// Route pour la création d'un utilisateur
router.post('/', auth , isAdmin, sessionMiddleware, async(req, res) => {
    UserController.createUser(req, res)
});

// Route pour la modification d'un utilisateur ( au moins root)
router.put('/:id', auth , isAdmin, sessionMiddleware, async(req, res) => {
    UserController.updateUser(req, res)
}); 

// Route pour la suppression d'un utilisateur ( au moins root)
router.delete('/:id', auth ,isRoot, async(req, res) => {
    UserController.deleteUser(req, res)
}); 


export default router;
