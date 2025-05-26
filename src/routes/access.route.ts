import express, { RequestHandler } from 'express';
import { AccessController } from "../controllers/access.controller";

const router = express.Router();

const handleAccessAttemptHandler: RequestHandler = async(req,res)=>{
    AccessController.handleAccessAttempt(req,res)
}
// Route pour recevoir les tentatives d'accès des dispositifs (badge/pin)
// Cet endpoint ne nécessite PAS l'authentification JWT d'utilisateur.
router.post('/', handleAccessAttemptHandler);

export default router; 