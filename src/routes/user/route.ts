
import { UserController } from '../../controllers/user.controller';
import { auth } from '../../middlewares/auth.middleware';
import express from 'express';
const router = express.Router();

// Route pour la récupération des informations d'un utilisateur
router.get('/me', auth , async(req, res) => {
    UserController.getUser(req, res)
});

// Route pour la création d'un utilisateur
router.post('/', auth , async(req, res) => {
    UserController.createUser(req, res)
});

// Route pour la modification d'un utilisateur
router.put('/:id', auth , async(req, res) => {
    UserController.updateUser(req, res)
}); 

// Route pour la suppression d'un utilisateur
router.delete('/:id', auth , async(req, res) => {
    UserController.deleteUser(req, res)
}); 

export default router;
