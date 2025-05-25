
import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { auth } from '../middlewares/auth.middleware';
const router = express.Router();

// Route pour la connexion d'un utilisateur
router.post('/login', async(req, res) => {
    AuthController.login(req, res)
});

// Route pour la déconnexion d'un utilisateur
router.post('/logout', 
    auth, 
    async(req, res) => {
    AuthController.logout(req, res)
});

export default router;
