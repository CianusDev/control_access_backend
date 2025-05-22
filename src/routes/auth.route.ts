
import express from 'express';
import { AuthController } from '../controllers/auth.controller';
const router = express.Router();

// Route pour la connexion d'un utilisateur
router.post('/login', async(req, res) => {
    AuthController.login(req, res)
});

export default router;
