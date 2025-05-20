
import { AuthController } from '../../controllers/auth.controller';
import express from 'express';
const router = express.Router();

// Route pour la connexion d'un utilisateur
router.post('/login', async(req, res) => {
    AuthController.login(req, res)
});

export default router;
