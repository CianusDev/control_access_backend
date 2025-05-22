import { AlertController } from "../controllers/alert.controller";
import express from 'express';

const router = express.Router();

// récupérer tous les alertes
router.get('/', async(req, res) => {
    AlertController.getAlerts(req, res)
});

// récupérer un alerte
router.get('/:id', async(req, res) => {
    AlertController.getAlert(req, res)
});

// créer une alerte
router.post('/', async(req, res) => {
    AlertController.createAlert(req, res)
});


// modifier  un alerte (supprimer)
router.patch('/:id', async(req, res) => {
    AlertController.updateDeletedAlert(req, res)
});

// modifier un log d'accès
// router.put('/:id', async(req, res) => {
//     AlertController.updateAlert(req, res)
// });

// supprimer un log d'accès
// router.delete('/:id', async(req, res) => {
//     AlertController.deleteAlert(req, res)
// });      

export default router;